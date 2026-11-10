const realFetch = globalThis.fetch;

globalThis.fetch = async (input, init) => {
  const url = typeof input === "string" ? input : input && input.url;
  console.log("FETCH_URL:", url);
  try {
    const h = new Headers(init && init.headers);
    console.log("HEADERS:", JSON.stringify(Object.fromEntries(h.entries())));
  } catch (e) {
    console.log("header parse error:", e.message);
  }
  return realFetch(input, init);
};

global.window = global;
global.document = { cookie: "", addEventListener() {}, removeEventListener() {} };
global.localStorage = {
  getItem: () => null,
  setItem() {},
  removeItem() {},
  key: () => null,
  length: 0,
};

const { createBrowserClient } = require("@supabase/ssr");

const c = createBrowserClient(
  "https://ajqfdfzqigcgioxhazkk.supabase.co",
  "sb_publishable_xAbcglClTCtloUyDaCZa3A_8HAywAb6",
);

c.from("students")
  .select("id,index_number,name,phone_number,school")
  .ilike("index_number", "FR0004")
  .maybeSingle()
  .then((r) => {
    console.log("DATA:", JSON.stringify(r.data));
    console.log("ERROR:", JSON.stringify(r.error));
    console.log("STATUS:", r.status);
  })
  .catch((e) => console.log("THROWN:", e.message));
