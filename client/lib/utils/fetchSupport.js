/**
 * Fetches a URL and returns the response.
 *
 * @param {Response} response - The object to convert.
 * @returns {object|string} Either the JSON data or the text data.
 */
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
