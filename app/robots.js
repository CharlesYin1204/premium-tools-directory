export default function robots(){return{rules:{userAgent:'*',allow:'/',disallow:['/admin','/api','/search','/go/']},sitemap:process.env.PUBLIC_URL+'/sitemap.xml'};}
