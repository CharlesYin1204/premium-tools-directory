// Only public content routes are eligible as internal entry destinations.
export function isLocalContentTarget(value){return typeof value==='string'&&/^\/(?:videos|comics|(?:video|comic)\/[a-z0-9][a-z0-9-]{0,79})$/.test(value);}
