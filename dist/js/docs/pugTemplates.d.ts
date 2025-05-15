/**
 * This module will export the necessary pug templates, so that we don't rely
 * on loading them from disk anymore.
 * This should avoid the troubles we were having trying to compile our ts into ESM and CJS modules.
 *
 * In ESM, __dirname does not work, and in CJS, import.meta.url does not work.
 *
 * So if we can avoid having to load pug templates from disk entirely
 * (so we don't need to know the absolute path of the sri4node module file)
 * we don't neede to suffer.
 */
import * as pug from "pug";
declare const index: pug.compileTemplate;
declare const resource: pug.compileTemplate;
declare const staticFiles: {
    "bootstrap.min.css": string;
    "custom.css": string;
};
export { index, resource, staticFiles };
