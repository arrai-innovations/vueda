import { createPinia, setActivePinia } from "pinia";
import { ref } from "vue";

const defaultObjectRetrieve = vi.fn();
const setObjectCrud = vi.fn();

vi.mock("@vueda/utils/objectCrud.js", () => ({ defaultObjectRetrieve }));

vi.mock("@arrai-innovations/reactive-helpers", async () => {
    const actual = await vi.importActual("@arrai-innovations/reactive-helpers");
    return { ...actual, setObjectCrud };
});

class FakeWebSocket extends EventTarget {
    static OPEN = 1;
    static CLOSED = 3;
    /** @type {FakeWebSocket[]} */
    static instances = [];

    constructor(url) {
        super();
        this.url = url;
        this.readyState = 0;
        this.sent = [];
        FakeWebSocket.instances.push(this);
    }

    send(data) {
        this.sent.push(JSON.parse(data));
    }

    close() {
        if (this.readyState === FakeWebSocket.CLOSED) {
            return;
        }
        this.readyState = FakeWebSocket.CLOSED;
        this.dispatchEvent(new Event("close"));
    }

    // Test helpers: what the server or the network does to the socket.
    acceptHandshake() {
        this.readyState = FakeWebSocket.OPEN;
        this.dispatchEvent(new Event("open"));
    }

    deliver(message) {
        const event = new Event("message");
        event.data = typeof message === "string" ? message : JSON.stringify(message);
        this.dispatchEvent(event);
    }
}

const latestSocket = () => FakeWebSocket.instances.at(-1);

/** A fetch result that the test resolves by hand, with the cancel method that a CRUD handler returns. */
function deferredRequest() {
    let settle;
    let fail;
    const promise = new Promise((resolve, reject) => {
        settle = resolve;
        fail = reject;
    });
    promise.cancel = vi.fn(() => fail(new Error("cancelled")));
    return Object.assign(promise, { resolve: settle, reject: fail });
}

let objectStreams;
let log;

beforeEach(async () => {
    vi.useFakeTimers();
    FakeWebSocket.instances = [];
    defaultObjectRetrieve.mockReset();
    setObjectCrud.mockReset();
    log = vi.fn();
    objectStreams = await import("@vueda/utils/objectStreams.js");
});

afterEach(() => {
    objectStreams.teardownObjectStreams();
    vi.useRealTimers();
});

const createConnection = () =>
    objectStreams.createObjectStreamConnection({
        url: "ws://api.example.com/ws/streams/",
        WebSocketImpl: FakeWebSocket,
        log,
    });

describe("lib/utils/objectStreams.js", () => {
    describe("Connection lifecycle", () => {
        it("opens no socket until the first subscription", () => {
            createConnection();

            expect(FakeWebSocket.instances).toHaveLength(0);
        });

        it("sends a subscription once the handshake succeeds", () => {
            const connection = createConnection();
            connection.subscribe({ op: "subscribe", kind: "object", model: "store.order", pk: "1" }, vi.fn());
            const socket = latestSocket();

            expect(socket.url).toBe("ws://api.example.com/ws/streams/");
            expect(socket.sent).toEqual([]);

            socket.acceptHandshake();

            expect(socket.sent).toEqual([
                { op: "subscribe", kind: "object", model: "store.order", pk: "1", subscription_id: "s1" },
            ]);
        });

        it("shares one open socket between subscriptions", () => {
            const connection = createConnection();
            connection.subscribe({ op: "subscribe", pk: "1" }, vi.fn());
            latestSocket().acceptHandshake();

            connection.subscribe({ op: "subscribe", pk: "2" }, vi.fn());

            expect(FakeWebSocket.instances).toHaveLength(1);
            expect(latestSocket().sent.map((message) => message.subscription_id)).toEqual(["s1", "s2"]);
        });

        it("unsubscribes, and closes the socket after the last subscription", () => {
            const connection = createConnection();
            const unsubscribeFirst = connection.subscribe({ op: "subscribe", pk: "1" }, vi.fn());
            const unsubscribeSecond = connection.subscribe({ op: "subscribe", pk: "2" }, vi.fn());
            const socket = latestSocket();
            socket.acceptHandshake();

            unsubscribeFirst();
            expect(socket.sent.at(-1)).toEqual({ op: "unsubscribe", subscription_id: "s1" });
            expect(socket.readyState).toBe(FakeWebSocket.OPEN);

            unsubscribeSecond();
            expect(socket.readyState).toBe(FakeWebSocket.CLOSED);

            vi.advanceTimersByTime(objectStreams.RECONNECT_MAX_DELAY);
            expect(FakeWebSocket.instances).toHaveLength(1);
        });
    });

    describe("Reconnecting", () => {
        it("reconnects after a lost socket and subscribes again", () => {
            const connection = createConnection();
            connection.subscribe({ op: "subscribe", pk: "1" }, vi.fn());
            latestSocket().acceptHandshake();

            latestSocket().close();
            vi.advanceTimersByTime(objectStreams.RECONNECT_MIN_DELAY - 1);
            expect(FakeWebSocket.instances).toHaveLength(1);

            vi.advanceTimersByTime(1);
            expect(FakeWebSocket.instances).toHaveLength(2);
            latestSocket().acceptHandshake();
            expect(latestSocket().sent).toEqual([{ op: "subscribe", pk: "1", subscription_id: "s1" }]);
        });

        it("doubles the delay after each refused handshake, up to the maximum", () => {
            const connection = createConnection();
            connection.subscribe({ op: "subscribe", pk: "1" }, vi.fn());
            const delays = [];

            for (let attempt = 0; attempt < 7; attempt += 1) {
                const count = FakeWebSocket.instances.length;
                latestSocket().close();
                let waited = 0;
                while (FakeWebSocket.instances.length === count) {
                    vi.advanceTimersByTime(1000);
                    waited += 1000;
                }
                delays.push(waited);
            }

            expect(delays).toEqual([1000, 2000, 4000, 8000, 16000, 30000, 30000]);
        });

        it("restarts with a new socket for the current subscriptions", () => {
            const connection = createConnection();
            connection.subscribe({ op: "subscribe", pk: "1" }, vi.fn());
            const first = latestSocket();
            first.acceptHandshake();

            connection.restart();

            expect(first.readyState).toBe(FakeWebSocket.CLOSED);
            expect(FakeWebSocket.instances).toHaveLength(2);
            latestSocket().acceptHandshake();
            expect(latestSocket().sent).toEqual([{ op: "subscribe", pk: "1", subscription_id: "s1" }]);
        });

        it("ignores messages from a socket that it replaced", () => {
            const connection = createConnection();
            const onMessage = vi.fn();
            connection.subscribe({ op: "subscribe", pk: "1" }, onMessage);
            const first = latestSocket();
            first.acceptHandshake();
            connection.restart();

            first.deliver({ type: "event", subscription_id: "s1" });

            expect(onMessage).not.toHaveBeenCalled();
        });
    });

    describe("Receiving messages", () => {
        it("hands each message to its own subscription", () => {
            const connection = createConnection();
            const first = vi.fn();
            const second = vi.fn();
            connection.subscribe({ op: "subscribe", pk: "1" }, first);
            connection.subscribe({ op: "subscribe", pk: "2" }, second);
            latestSocket().acceptHandshake();

            latestSocket().deliver({ type: "event", subscription_id: "s2", op: "updated" });

            expect(first).not.toHaveBeenCalled();
            expect(second).toHaveBeenCalledWith({ type: "event", subscription_id: "s2", op: "updated" });
        });

        it("logs server errors and text that is not JSON", () => {
            const connection = createConnection();
            const onMessage = vi.fn();
            connection.subscribe({ op: "subscribe", pk: "1" }, onMessage);
            latestSocket().acceptHandshake();

            latestSocket().deliver({ type: "error", code: "not_found", message: "Object does not exist." });
            latestSocket().deliver("not json");

            expect(onMessage).not.toHaveBeenCalled();
            expect(log).toHaveBeenCalledTimes(2);
        });
    });

    describe("Object subscribe handler", () => {
        const target = { app: "store", model: "customer_order" };
        const params = { f: ["id", "name"] };

        function subscribeObject(callback = vi.fn(), isCancelled = ref(false)) {
            objectStreams.setupObjectStreams({ WebSocketImpl: FakeWebSocket, log });
            const subscription = objectStreams.objectStreamSubscribe({ target, pk: 7, params, callback, isCancelled });
            latestSocket().acceptHandshake();
            return { subscription, callback, isCancelled, socket: latestSocket() };
        }

        it("subscribes to the record by app label, model name, and primary key", () => {
            const { socket } = subscribeObject();

            expect(socket.url).toBe(`ws://${window.location.hostname}/ws/streams/`);
            expect(socket.sent).toEqual([
                { op: "subscribe", kind: "object", model: "store.customer_order", pk: "7", subscription_id: "s1" },
            ]);
        });

        it("refetches the record through REST after an event", async () => {
            const request = deferredRequest();
            defaultObjectRetrieve.mockReturnValue(request);
            const { callback, socket } = subscribeObject();

            socket.deliver({ type: "event", subscription_id: "s1", facet: "workflow_state", op: "updated" });
            request.resolve({ id: 7, name: "Updated" });
            await request;

            expect(defaultObjectRetrieve).toHaveBeenCalledWith({ target, pk: 7, params });
            expect(callback).toHaveBeenCalledWith({ id: 7, name: "Updated" }, "update");
        });

        it("refetches after a resync request", () => {
            defaultObjectRetrieve.mockReturnValue(deferredRequest());
            const { socket } = subscribeObject();

            socket.deliver({ type: "resync_required", subscription_id: "s1" });

            expect(defaultObjectRetrieve).toHaveBeenCalledTimes(1);
        });

        it("keeps only the latest refetch when events arrive close together", async () => {
            const first = deferredRequest();
            const second = deferredRequest();
            defaultObjectRetrieve.mockReturnValueOnce(first).mockReturnValueOnce(second);
            const { callback, socket } = subscribeObject();

            socket.deliver({ type: "event", subscription_id: "s1", facet: "object", op: "updated" });
            socket.deliver({ type: "event", subscription_id: "s1", facet: "object", op: "updated" });
            second.resolve({ id: 7, name: "Second" });
            await second;
            await first.catch(() => {});

            expect(first.cancel).toHaveBeenCalled();
            expect(callback).toHaveBeenCalledTimes(1);
            expect(callback).toHaveBeenCalledWith({ id: 7, name: "Second" }, "update");
        });

        it("reports a deleted record without a refetch", () => {
            const { callback, socket } = subscribeObject();

            socket.deliver({ type: "event", subscription_id: "s1", facet: "object", op: "deleted" });

            expect(defaultObjectRetrieve).not.toHaveBeenCalled();
            expect(callback).toHaveBeenCalledWith({}, "delete");
        });

        it("keeps the view as it was when a refetch fails", async () => {
            const request = deferredRequest();
            defaultObjectRetrieve.mockReturnValue(request);
            const { callback, socket } = subscribeObject();

            socket.deliver({ type: "event", subscription_id: "s1", facet: "object", op: "updated" });
            request.reject(new Error("404"));
            await request.catch(() => {});

            expect(callback).not.toHaveBeenCalled();
        });

        it("resolves at once, so the view does not wait for the socket", async () => {
            const { subscription } = subscribeObject();
            let resolved = false;
            subscription.then(() => {
                resolved = true;
            });

            await Promise.resolve();

            expect(resolved).toBe(true);
            expect(subscription.cancel).toBeTypeOf("function");
        });

        it("unsubscribes on cancel and drops a refetch in flight", async () => {
            const request = deferredRequest();
            defaultObjectRetrieve.mockReturnValue(request);
            const { subscription, callback, isCancelled, socket } = subscribeObject();
            socket.deliver({ type: "event", subscription_id: "s1", facet: "object", op: "updated" });

            isCancelled.value = true;
            await subscription.cancel();

            expect(request.cancel).toHaveBeenCalled();
            expect(socket.sent.at(-1)).toEqual({ op: "unsubscribe", subscription_id: "s1" });
            expect(callback).not.toHaveBeenCalled();
        });
    });

    describe("Workflow history", () => {
        const target = { app: "store", model: "customer_order" };
        let key;
        let getAppModelDotName;

        async function cacheHistory() {
            ({ getAppModelDotName } = await import("@vueda/utils/case.js"));
            key = getAppModelDotName(target);
            const { storeWorkflow } = await import("@vueda/stores/storeWorkflow.js");
            const store = storeWorkflow();
            store.objectHistories[key] = { 7: [{ state: "new" }], 8: [{ state: "new" }] };
            return store;
        }

        function watchRecord() {
            objectStreams.setupObjectStreams({ WebSocketImpl: FakeWebSocket, log });
            const onChange = vi.fn();
            objectStreams.watchObjectChanges({ target, pk: 7 }, onChange);
            latestSocket().acceptHandshake();
            return { onChange, socket: latestSocket() };
        }

        beforeEach(() => {
            setActivePinia(createPinia());
        });

        it("drops the record's cached history after a workflow state change", async () => {
            const store = await cacheHistory();
            const { onChange, socket } = watchRecord();

            socket.deliver({ type: "event", subscription_id: "s1", facet: "workflow_state", op: "updated" });

            expect(store.objectHistories[key]).toEqual({ 8: [{ state: "new" }] });
            expect(onChange).toHaveBeenCalledTimes(1);
        });

        it("drops the record's cached history after a resync", async () => {
            const store = await cacheHistory();
            const { socket } = watchRecord();

            socket.deliver({ type: "resync_required", subscription_id: "s1" });

            expect(store.objectHistories[key][7]).toBeUndefined();
        });

        it("keeps the cached history after a change to the record's own fields", async () => {
            const store = await cacheHistory();
            const { socket } = watchRecord();

            socket.deliver({ type: "event", subscription_id: "s1", facet: "object", op: "updated" });

            expect(store.objectHistories[key][7]).toEqual([{ state: "new" }]);
        });

        it("leaves an unused workflow store alone", () => {
            const pinia = createPinia();
            setActivePinia(pinia);
            const { socket } = watchRecord();

            socket.deliver({ type: "event", subscription_id: "s1", facet: "workflow_state", op: "updated" });

            expect("workflow" in pinia.state.value).toBe(false);
        });
    });

    describe("Setup", () => {
        it("installs the subscribe handler and enables subscriptions", () => {
            expect(objectStreams.objectStreamsEnabled()).toBe(false);

            objectStreams.setupObjectStreams({ WebSocketImpl: FakeWebSocket });

            expect(objectStreams.objectStreamsEnabled()).toBe(true);
            expect(setObjectCrud).toHaveBeenCalledWith({ subscribe: objectStreams.objectStreamSubscribe });
        });

        it("subscribes to nothing before setup", async () => {
            const subscription = objectStreams.objectStreamSubscribe({
                target: { app: "store", model: "order" },
                pk: 1,
                params: {},
                callback: vi.fn(),
            });

            await subscription.cancel();
            await subscription;

            expect(FakeWebSocket.instances).toHaveLength(0);
        });

        it("restarts nothing before setup", () => {
            expect(() => objectStreams.restartObjectStreams()).not.toThrow();
        });
    });
});
