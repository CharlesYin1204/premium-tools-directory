import test from 'node:test';
import assert from 'node:assert/strict';
import tools from '../data/general-tools.json' with {type:'json'};
import {reviewedItems} from '../lib/ai-scope.js';

test('通用工具数据完整、唯一且使用 HTTPS',()=>{assert.ok(tools.entries.length>=20);assert.equal(new Set(tools.entries.map(x=>x.slug)).size,tools.entries.length);assert.equal(new Set(tools.entries.map(x=>x.url)).size,tools.entries.length);for(const item of tools.entries){assert.match(item.url,/^https:\/\//);assert.ok(item.name&&item.description);assert.ok(tools.categories.some(category=>category.slug===item.category));}});
test('AI 推荐只接受与内置清单完全一致的通用工具',()=>{const source=tools.entries[0],safe={id:'safe',slug:source.slug,name:source.name,target_url:source.url,source_system:'premium-general-tools',source_id:source.slug};const tampered={...safe,id:'tampered',target_url:'https://example.com/'};assert.deepEqual(reviewedItems({entries:[safe,tampered]},'entries').map(x=>x.id),['safe']);});
