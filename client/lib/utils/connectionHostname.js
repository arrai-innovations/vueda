function getHostname() {
    const port = import.meta.env.VITE_DJANGO_CONNECTION_PORT;
    return (port && window.location.hostname + ":" + port) || window.location.hostname;
}

export const connectionHostname = getHostname();

export const httpOrHttpsHostname = `${window.location.protocol}//${connectionHostname}`;
export const wsOrWssHostname = `ws${window.location.protocol === "https:" ? "s" : ""}://${connectionHostname}`;
