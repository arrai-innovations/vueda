export async function getJsonOrText(response) {
    let data;
    // we can't double consume the response body
    data = await response.text();
    try {
        data = JSON.parse(data);
    } catch (e) {
        if (!(e instanceof SyntaxError)) {
            throw e;
        }
    }
    return data;
}
