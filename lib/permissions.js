const permissions={read:['super','operator','editor','viewer'],write:['super','operator','editor'],publish:['super','operator'],sync:['super','operator'],export:['super','operator'],audit:['super','operator'],settings:['super']};
export function can(role,action='read'){return !!permissions[action]?.includes(role);}
export function sectionAction(section){return ['settings','users'].includes(section)?'settings':section==='audit'?'audit':'read';}
