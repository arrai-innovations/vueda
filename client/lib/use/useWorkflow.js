import { assignReactiveObject } from "@arrai-innovations/reactive-helpers";
import get from "lodash-es/get.js";
import set from "lodash-es/set.js";
import snakeCase from "lodash-es/snakeCase.js";
import { reactive, readonly, unref } from "vue";
import { useRouter } from "vue-router";

import { httpOrHttpsHostname } from "@/utils/connectionHostname";
import { getCSRFValue } from "@/utils/csrf";
import { getJsonOrText } from "@/utils/fetchSupport";

class WorkflowError extends Error {
    constructor(messagePrefix, response, responseData) {
        const message = `${messagePrefix}: ${response.status} ${response.statusText}`;
        super(message);
        this.name = "WorkflowError";
        this.response = response;
        this.responseData = responseData;
    }
}

function handleNotOk(response, data, messagePrefix, empty) {
    if (!response.ok) {
        // if the user is not logged in, or is and does not have permission to transition the object, the response will be 403
        if (response.status === 403 && empty) {
            return empty;
        }
        throw new WorkflowError(messagePrefix, response, data);
    }
    return data;
}

const state = reactive({
    objectStates: [],
    objectTransitions: [],
    objectHistories: [],
    modelStates: {},
});

const readonlyState = readonly(state);

const updateState = (target, source) => {
    const index = target.findIndex(
        (state) => state.id === source.id && state.app === source.app && state.model === source.model
    );
    if (index === -1) {
        target.push(source);
    } else {
        assignReactiveObject(target[index], source);
    }
};
const fetchModelStates = async (app, model) => {
    const snakeCaseApp = snakeCase(app);
    const snakeCaseModel = snakeCase(model);
    const key = `${snakeCaseApp}.${snakeCaseModel}`;
    const existing = get(state.modelStates, key);
    if (existing) {
        return existing;
    }
    const response = await fetch(`${httpOrHttpsHostname}/routes/workflows/states/${snakeCaseApp}/${snakeCaseModel}/`, {
        method: "GET",
        credentials: "include",
    });
    const responseData = await getJsonOrText(response);
    const data = handleNotOk(response, responseData, "Failed to fetch states for model", "marker");
    if (data !== "marker") {
        set(state.modelStates, key, data);
    }
};
const fetchObjectState = async (app, model, objectId) => {
    const result = {
        app: unref(app),
        model: unref(model),
        id: unref(objectId),
    };
    const response = await fetch(
        `${httpOrHttpsHostname}/routes/workflows/object-state/${snakeCase(app)}/${snakeCase(model)}/${objectId}/`,
        {
            method: "GET",
            credentials: "include",
        }
    );
    let responseData;
    responseData = await getJsonOrText(response);
    if (responseData === "Object does not have a workflow.") {
        return result;
    }
    responseData = handleNotOk(response, responseData, "Failed to fetch object state", {});
    updateState(state.objectStates, { ...result, ...responseData });
};
const fetchObjectTransitions = async (app, model, objectId) => {
    const result = {
        app: unref(app),
        model: unref(model),
        id: unref(objectId),
    };
    const response = await fetch(
        `${httpOrHttpsHostname}/routes/workflows/object-transitions/${snakeCase(app)}/${snakeCase(model)}/${objectId}/`,
        {
            method: "GET",
            credentials: "include",
        }
    );
    let responseData;
    responseData = await getJsonOrText(response);
    if (responseData === "Object does not have a workflow.") {
        return result;
    }
    responseData = handleNotOk(response, responseData, "Failed to fetch object transitions", []);
    updateState(state.objectTransitions, { ...result, transitions: responseData });
};
const fetchObjectHistory = async (app, model, objectId) => {
    const result = {
        app: unref(app),
        model: unref(model),
        id: unref(objectId),
    };
    const response = await fetch(
        `${httpOrHttpsHostname}/routes/workflows/object-history/${snakeCase(app)}/${snakeCase(model)}/${objectId}/`,
        {
            method: "GET",
            credentials: "include",
        }
    );
    let responseData;
    responseData = await getJsonOrText(response);
    if (responseData === "Object does not have a workflow.") {
        return result;
    }
    handleNotOk(response, responseData, "Failed to fetch object transitions", []);
    updateState(state.objectHistories, { ...result, history: responseData });
};
const executeTransition = async (router, stateToRoute, app, model, objectId, transition_code) => {
    const result = {
        app: unref(app),
        model: unref(model),
        id: unref(objectId),
    };
    const response = await fetch(
        `${httpOrHttpsHostname}/routes/workflows/execute-transition/${snakeCase(app)}/${snakeCase(model)}/${objectId}/`,
        {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": getCSRFValue(),
            },
            credentials: "include",
            body: JSON.stringify({ transition_code }),
        }
    );
    let responseData;
    responseData = await getJsonOrText(response);
    handleNotOk(response, responseData, "Failed to execute transition");
    updateState(state.objectStates, { ...result, ...responseData.new_state });
    updateState(state.objectTransitions, { ...result, transitions: responseData.new_transitions });
    if (stateToRoute && responseData.new_state.state.code in stateToRoute) {
        router.push(stateToRoute[responseData.new_state.state.code]);
    }
    return result;
};

export default function useWorkflow(stateToRoute) {
    const router = useRouter();
    return {
        state: readonlyState,
        fetchModelStates,
        fetchObjectState,
        fetchObjectTransitions,
        fetchObjectHistory,
        executeTransition: executeTransition.bind(null, router, stateToRoute),
    };
}
