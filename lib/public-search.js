export function searchPublished(data, value) {
 const query = String(value || '').trim().slice(0, 50).toLocaleLowerCase();
 const rank = item => {
  const name = (item.name || item.title || '').toLocaleLowerCase();
  return name === query ? 0 : name.startsWith(query) ? 1 : 2;
 };
 const match = item => query && [item.name, item.title, item.description, item.summary,
  ...(item.tags || []), ...(item.aliases || []),
  data.companies.find(company => company.id === item.company_id)?.name
 ].filter(Boolean).join(' ').toLocaleLowerCase().includes(query);
 return [
  {id:'entries', label:'站点', items:data.entries.filter(match)},
  {id:'video', label:'视频', items:data.contents.filter(item => item.type === 'video' && match(item))},
  {id:'comic', label:'漫画', items:data.contents.filter(item => item.type === 'comic' && match(item))}
 ].map(group => ({...group, items:group.items.sort((a,b) => rank(a)-rank(b))}));
}
