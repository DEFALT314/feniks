// "A+" settings shared by the server (app/layout.tsx reads the cookie) and the client toggle
// (text-size-toggle.tsx). Kept out of the "use client" module: the server can't call its functions.
export const A11Y_PLUS_COOKIE = "hubmi-a11y-plus";
export const A11Y_PLUS_ATTRIBUTE = "data-a11y-plus";

/** Restores the choice from localStorage before first paint, for visits from before the cookie. */
export const A11Y_PLUS_SCRIPT = `try{if(localStorage.getItem("${A11Y_PLUS_COOKIE}")==="1")document.documentElement.setAttribute("${A11Y_PLUS_ATTRIBUTE}","")}catch(e){}`;

/** Server side: is A+ on for this request (cookie value)? */
export function a11yPlusFromCookie(value: string | undefined): boolean {
  return value === "1";
}
