/*
@header({
  searchable: 1,
  filterable: 1,
  quickSearch: 0,
  title: '大师兄影视',
  '类型': '影视',
  lang: 'ds'
})
*/

var rule = {
    类型: '影视',
    title: '大师兄影视',
    host: 'https://www.wfskjk.com',
    url: '/show/fyfilter.html',
    searchUrl: '/search/-------------.html?wd=**&submit=',
    headers: {'User-Agent': 'MOBILE_UA'},
    searchable: 2, quickSearch: 1, filterable: 1, play_parse: true, double: false, limit: 6,
    filter_url:'{{fl.class or "fyclass"}}--{{fl.by}}------fypage---{{fl.year}}.html',
    filter: {
        "1": [{"key":"class","name":"剧情","value":[{"n":"全部","v":"1"},{"n":"动作","v":"6"},{"n":"喜剧","v":"7"},{"n":"爱情","v":"8"},{"n":"科幻","v":"9"},{"n":"恐怖","v":"10"},{"n":"剧情","v":"11"},{"n":"战争","v":"12"},{"n":"动画","v":"24"},{"n":"记录","v":"23"}]},{"key":"year","name":"年份","value":[{"n":"全部","v":""},{"n":"2026","v":"2026"},{"n":"2025","v":"2025"},{"n":"2024","v":"2024"},{"n":"2023","v":"2023"},{"n":"2022","v":"2022"},{"n":"2021","v":"2021"},{"n":"2020","v":"2020"},{"n":"2019","v":"2019"},{"n":"2018","v":"2018"},{"n":"2017","v":"2017"},{"n":"2016","v":"2016"},{"n":"2015","v":"2015"},{"n":"2014","v":"2014"},{"n":"2013","v":"2013"},{"n":"2012","v":"2012"},{"n":"2011","v":"2011"},{"n":"2010","v":"2010"},{"n":"2009","v":"2009"},{"n":"2008","v":"2008"},{"n":"2007","v":"2007"},{"n":"2006","v":"2006"},{"n":"2005","v":"2005"},{"n":"2004","v":"2004"},{"n":"2003","v":"2003"},{"n":"2002","v":"2002"},{"n":"2001","v":"2001"},{"n":"2000","v":"2000"}]},{"key":"by","name":"排序","value":[{"n":"时间","v":"time"},{"n":"人气","v":"hits"},{"n":"评分","v":"score"}]}],
        "2": [{"key":"class","name":"剧情","value":[{"n":"全部","v":"2"},{"n":"国产剧","v":"13"},{"n":"香港剧","v":"14"},{"n":"韩国剧","v":"15"},{"n":"欧美剧","v":"16"},{"n":"台湾剧","v":"20"},{"n":"日本剧","v":"21"},{"n":"泰剧","v":"34"},{"n":"其他剧","v":"22"}]},{"key":"year","name":"年份","value":[{"n":"全部","v":""},{"n":"2026","v":"2026"},{"n":"2025","v":"2025"},{"n":"2024","v":"2024"},{"n":"2023","v":"2023"},{"n":"2022","v":"2022"},{"n":"2021","v":"2021"},{"n":"2020","v":"2020"},{"n":"2019","v":"2019"},{"n":"2018","v":"2018"},{"n":"2017","v":"2017"},{"n":"2016","v":"2016"},{"n":"2015","v":"2015"},{"n":"2014","v":"2014"},{"n":"2013","v":"2013"},{"n":"2012","v":"2012"},{"n":"2011","v":"2011"},{"n":"2010","v":"2010"},{"n":"2009","v":"2009"},{"n":"2008","v":"2008"},{"n":"2007","v":"2007"},{"n":"2006","v":"2006"},{"n":"2005","v":"2005"},{"n":"2004","v":"2004"},{"n":"2003","v":"2003"},{"n":"2002","v":"2002"},{"n":"2001","v":"2001"},{"n":"2000","v":"2000"}]},{"key":"by","name":"排序","value":[{"n":"时间","v":"time"},{"n":"人气","v":"hits"},{"n":"评分","v":"score"}]}],
        "3": [{"key":"class","name":"剧情","value":[{"n":"全部","v":"3"},{"n":"大陆综艺","v":"25"},{"n":"日韩综艺","v":"26"},{"n":"港台综艺","v":"27"},{"n":"欧美综艺","v":"28"}]},{"key":"year","name":"年份","value":[{"n":"全部","v":""},{"n":"2026","v":"2026"},{"n":"2025","v":"2025"},{"n":"2024","v":"2024"},{"n":"2023","v":"2023"},{"n":"2022","v":"2022"},{"n":"2021","v":"2021"},{"n":"2020","v":"2020"},{"n":"2019","v":"2019"},{"n":"2018","v":"2018"},{"n":"2017","v":"2017"},{"n":"2016","v":"2016"},{"n":"2015","v":"2015"},{"n":"2014","v":"2014"},{"n":"2013","v":"2013"},{"n":"2012","v":"2012"},{"n":"2011","v":"2011"},{"n":"2010","v":"2010"},{"n":"2009","v":"2009"},{"n":"2008","v":"2008"},{"n":"2007","v":"2007"},{"n":"2006","v":"2006"},{"n":"2005","v":"2005"},{"n":"2004","v":"2004"},{"n":"2003","v":"2003"},{"n":"2002","v":"2002"},{"n":"2001","v":"2001"},{"n":"2000","v":"2000"}]},{"key":"by","name":"排序","value":[{"n":"时间","v":"time"},{"n":"人气","v":"hits"},{"n":"评分","v":"score"}]}],
        "4": [{"key":"class","name":"剧情","value":[{"n":"全部","v":"4"},{"n":"国产动漫","v":"29"},{"n":"日韩动漫","v":"30"},{"n":"欧美动漫","v":"31"},{"n":"其他动漫","v":"32"}]},{"key":"year","name":"年份","value":[{"n":"全部","v":""},{"n":"2026","v":"2026"},{"n":"2025","v":"2025"},{"n":"2024","v":"2024"},{"n":"2023","v":"2023"},{"n":"2022","v":"2022"},{"n":"2021","v":"2021"},{"n":"2020","v":"2020"},{"n":"2019","v":"2019"},{"n":"2018","v":"2018"},{"n":"2017","v":"2017"},{"n":"2016","v":"2016"},{"n":"2015","v":"2015"},{"n":"2014","v":"2014"},{"n":"2013","v":"2013"},{"n":"2012","v":"2012"},{"n":"2011","v":"2011"},{"n":"2010","v":"2010"},{"n":"2009","v":"2009"},{"n":"2008","v":"2008"},{"n":"2007","v":"2007"},{"n":"2006","v":"2006"},{"n":"2005","v":"2005"},{"n":"2004","v":"2004"},{"n":"2003","v":"2003"},{"n":"2002","v":"2002"},{"n":"2001","v":"2001"},{"n":"2000","v":"2000"}]},{"key":"by","name":"排序","value":[{"n":"时间","v":"time"},{"n":"人气","v":"hits"},{"n":"评分","v":"score"}]}],
        "36": [{"key":"class","name":"剧情","value":[{"n":"全部","v":"36"},{"n":"爽文短剧","v":"37"},{"n":"女频恋爱","v":"38"},{"n":"反转爽剧","v":"39"},{"n":"古装仙侠","v":"40"},{"n":"年代穿越","v":"41"},{"n":"脑洞悬疑","v":"42"},{"n":"现代都市","v":"43"}]},{"key":"year","name":"年份","value":[{"n":"全部","v":""},{"n":"2026","v":"2026"},{"n":"2025","v":"2025"},{"n":"2024","v":"2024"},{"n":"2023","v":"2023"},{"n":"2022","v":"2022"},{"n":"2021","v":"2021"},{"n":"2020","v":"2020"},{"n":"2019","v":"2019"},{"n":"2018","v":"2018"},{"n":"2017","v":"2017"},{"n":"2016","v":"2016"},{"n":"2015","v":"2015"},{"n":"2014","v":"2014"},{"n":"2013","v":"2013"},{"n":"2012","v":"2012"},{"n":"2011","v":"2011"},{"n":"2010","v":"2010"},{"n":"2009","v":"2009"},{"n":"2008","v":"2008"},{"n":"2007","v":"2007"},{"n":"2006","v":"2006"},{"n":"2005","v":"2005"},{"n":"2004","v":"2004"},{"n":"2003","v":"2003"},{"n":"2002","v":"2002"},{"n":"2001","v":"2001"},{"n":"2000","v":"2000"}]},{"key":"by","name":"排序","value":[{"n":"时间","v":"time"},{"n":"人气","v":"hits"},{"n":"评分","v":"score"}]}]
    },
    filter_def:{"1":[{class:"1"},{by:'time'}],"2":[{class:"2"},{by:'time'}],"3":[{class:"3"},{by:'time'}],"4":[{class:"4"},{by:'time'}],"36":[{class:"36"},{by:'time'}]},
    class_name: '电影&电视剧&综艺&动漫&短剧',
    class_url: '1&2&3&4&36',

  // 一级: '.stui-vodlist&&li;a&&title;a&&data-original;.pic-text&&Text;a&&href',
  // 二级: {
  //   "title": '.stui-content&&h1&&Html',
  //   "img": '.lazyload&&data-original',
  //   "desc": '.stui-content__detail&&span&&Text;.stui-content__detail&&a&&Text',
  //   "content": '.stui-content__detail&&.branch&&Text',
  //   "tabs": '.nav-tabs&&li',
  //   "lists": '.tab-content&&div:eq(#id) a',
  // },
  // 搜索: '.stui-pannel_bd&&ul&&li;h3&&a&&Text;.thumb&&a&&data-original;.detail&&p:eq(1)&&Text;.detail&&p:eq(2)&&Text;a&&href',
    
    lazy: async function () {
        let {input} = this
        const content = (await req(input)).content
        const html = JSON.parse(content.match(/r player_.*?=(.*?)</)[1])
        let url = html.url
        if (html.encrypt) {
            url = html.encrypt === "2" ? unescape(base64Decode(url)) : unescape(url)
            return {parse: 0, url}
        }
        return {parse: /m3u8|mp4/.test(url) ? 0 : 1, url: /m3u8|mp4/.test(url) ? url : input}
    },
    推荐: async function () {
        let {input, pdfa, pdfh, pd} = this;
        let html = await request(input + '/label/hot.html');
        let d = [];
        let data = pdfa(html, '.stui-vodlist li');
        data.forEach((it) => {
            d.push({
                title: pdfh(it, 'a&&title'),
                pic_url: pd(it, 'a&&data-original'),
                desc: pdfh(it, '.text&&Text'),
                url: pd(it, 'a&&href'),
            })
        });
        return setResult(d)
    },
    一级: async function () {
        let {input, pdfa, pdfh, pd} = this;
        let html = await request(input);
        let d = [];
        let data = pdfa(html, '.stui-vodlist li');
        data.forEach((it) => {
            d.push({
                title: pdfh(it, 'a&&title'),
                pic_url: pd(it, 'a&&data-original'),
                desc: pdfh(it, '.text text-overflow text-muted hidden-xs&&Text'),
                url: pd(it, 'a&&href'),
            })
        });
        return setResult(d)
    },
    二级: async function () {
        let {input, pdfa, pdfh, pd} = this;
        let html = await request(input);
        let VOD = {};
        
        // 提取标题
        VOD.vod_name = pdfh(html, '.stui-content__detail h1&&Text') || '';
        if (VOD.vod_name) {
            VOD.vod_name = VOD.vod_name.split('/')[0].trim();
        }
        
        // 提取图片
        VOD.vod_pic = pd(html, '.lazyload&&data-original') || '';
        if (VOD.vod_pic && !VOD.vod_pic.startsWith('http')) {
            VOD.vod_pic = this.host + VOD.vod_pic;
        }
        
        // 提取简介
        VOD.vod_content = pdfh(html, '.detail-sketch&&Text') || '';
        
        // 提取导演、主演、年份、地区等信息
        let detailTexts = pdfa(html, '.stui-content__detail p');
        detailTexts.forEach((p) => {
            let text = pdfh(p, 'Text') || '';
            if (text.includes('导演：')) {
                VOD.vod_director = text.replace('导演：', '').trim();
            } else if (text.includes('主演：')) {
                VOD.vod_actor = text.replace('主演：', '').trim();
            } else if (text.includes('年份：')) {
                VOD.vod_year = text.replace('年份：', '').trim();
            } else if (text.includes('地区：')) {
                VOD.vod_area = text.replace('地区：', '').trim();
            } else if (text.includes('语言：')) {
                VOD.vod_lang = text.replace('语言：', '').trim();
            } else if (text.includes('类型：')) {
                VOD.vod_type = text.replace('类型：', '').trim();
            }
        });
        
        // 提取播放列表
        let tabs = pdfa(html, '.nav-tabs li');
        let lists = pdfa(html, '.stui-content__playlist');
        let playmap = {};
        
        tabs.forEach((tab, i) => {
            const form = pdfh(tab, 'Text');
            const list = lists[i];
            if (list) {
                const items = pdfa(list, 'li');
                const playItems = [];
                items.forEach((item) => {
                    let title = pdfh(item, 'a&&Text');
                    let urls = pd(item, 'a&&href', input);
                    if (title && urls) {
                        playItems.push(title + "$" + urls);
                    }
                });
                if (playItems.length > 0) {
                    playmap[form] = playItems;
                }
            }
        });
        
        VOD.vod_play_from = Object.keys(playmap).join('$$$');
        const urls = Object.values(playmap);
        const playUrls = urls.map((urllist) => {
            return urllist.join("#");
        });
        VOD.vod_play_url = playUrls.join('$$$');
        
        return VOD;
    },
    搜索: async function () {
        let {input, pdfa, pdfh, pd} = this;
        let html = await request(input);
        let d = [];
        let data = pdfa(html, '.stui-vodlist__media li');
        data.forEach((it) => {
            d.push({
                title: pdfh(it, 'a&&title'),
                pic_url: pd(it, 'a&&data-original'),
                desc: pdfh(it, '.text text-overflow text-muted hidden-xs&&Text'),
                url: pd(it, 'a&&href'),
            })
        });
        return setResult(d)
    }
}
