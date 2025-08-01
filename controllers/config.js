import {readdirSync, readFileSync, writeFileSync, existsSync} from 'fs';
import {readFile} from 'fs/promises';
import path from 'path';
import * as drpy from '../libs/drpyS.js';
import '../libs_drpy/jinja.js'
import {naturalSort, urljoin, updateQueryString} from '../utils/utils.js'
import {md5} from "../libs_drpy/crypto-util.js";
import {ENV} from "../utils/env.js";
import FileHeaderManager from "../utils/fileHeaderManager.js";
import {extractNameFromCode} from "../utils/python.js";
import {validateBasicAuth, validatePwd} from "../utils/api_validate.js";
import {getSitesMap} from "../utils/sites-map.js";
import {getParsesDict} from "../utils/file.js";
import batchExecute from '../libs_drpy/batchExecute.js';

const {jsEncoder} = drpy;

// 工具函数：生成 JSON 数据
async function generateSiteJSON(options, requestHost, sub, pwd) {
    const jsDir = options.jsDir;
    const dr2Dir = options.dr2Dir;
    const pyDir = options.pyDir;
    const configDir = options.configDir;
    const jsonDir = options.jsonDir;
    const subFilePath = options.subFilePath;
    const rootDir = options.rootDir;

    const files = readdirSync(jsDir);
    let valid_files = files.filter((file) => file.endsWith('.js') && !file.startsWith('_')); // 筛选出不是 "_" 开头的 .js 文件
    let sort_list = [];
    if (sub) {
        if (sub.mode === 0) {
            valid_files = valid_files.filter(it => (new RegExp(sub.reg || '.*')).test(it));
        } else if (sub.mode === 1) {
            valid_files = valid_files.filter(it => !(new RegExp(sub.reg || '.*')).test(it));
        }
        let sort_file = path.join(path.dirname(subFilePath), `./order_common.html`);
        if (!existsSync(sort_file)) {
            sort_file = path.join(path.dirname(subFilePath), `./order_common.example.html`);
        }
        if (sub.sort) {
            sort_file = path.join(path.dirname(subFilePath), `./${sub.sort}.html`);
            if (!existsSync(sort_file)) {
                sort_file = path.join(path.dirname(subFilePath), `./${sub.sort}.example.html`);
            }
        }
        if (existsSync(sort_file)) {
            console.log('sort_file:', sort_file);
            let sort_file_content = readFileSync(sort_file, 'utf-8');
            // console.log(sort_file_content)
            sort_list = sort_file_content.split('\n').filter(it => it.trim()).map(it => it.trim());
            // console.log(sort_list);
        }
    }
    let sites = [];

    //以下为自定义APP模板部分
    try {
        const templateConfigPath = path.join(jsonDir, './App模板配置.json');
        if (existsSync(templateConfigPath)) {
            const templateContent = readFileSync(templateConfigPath, 'utf-8');
            const templateConfig = JSON.parse(templateContent);
            sites = Object.entries(templateConfig).filter(([key]) => valid_files.includes(`${key}[模板].js`))
                .flatMap(([key, config]) =>
                    Object.entries(config)
                        .filter(([name]) => name !== "示例")
                        .map(([name]) => ({
                            key: `drpyS_${name}_${key}`,
                            name: `${name}[M](${key.replace('App', '').toUpperCase()})`,
                            type: 4,
                            api: `${requestHost}/api/${key}[模板]${pwd ? `?pwd=${pwd}` : ''}`,
                            searchable: 1,
                            filterable: 1,
                            quickSearch: 0,
                            ext: `../json/App模板配置.json$${name}`
                        })));
        }
    } catch (e) {
        console.error('读取App模板配置失败:', e.message);
    }
    //以上为自定义APP[模板]配置自动添加代码

    let link_jar = '';
    let enableRuleName = ENV.get('enable_rule_name', '0') === '1';
    let isLoaded = await drpy.isLoaded();
    let forceHeader = Number(process.env.FORCE_HEADER) || 0;
    let dr2ApiType = Number(process.env.DR2_API_TYPE) || 0; // 0 ds里的api 1壳子内置
    // console.log('hide_adult:', ENV.get('hide_adult'));
    if (ENV.get('hide_adult') === '1') {
        valid_files = valid_files.filter(it => !(new RegExp('\\[[密]\\]|密+')).test(it));
    }
    let SitesMap = getSitesMap(configDir);
    // console.log(SitesMap);
    log(`开始生成ds的t4配置，jsDir:${jsDir},源数量: ${valid_files.length}`);
    const tasks = valid_files.map((file) => {
        return {
            func: async ({file, jsDir, requestHost, pwd, drpy, SitesMap, jsEncoder}) => {
                const baseName = path.basename(file, '.js'); // 去掉文件扩展名
                let api = `${requestHost}/api/${baseName}`;  // 使用请求的 host 地址，避免硬编码端口
                if (pwd) {
                    api += `?pwd=${pwd}`;
                }
                let ruleObject = {
                    searchable: 0, // 固定值
                    filterable: 0, // 固定值
                    quickSearch: 0, // 固定值
                };
                let ruleMeta = {...ruleObject};
                // if (baseName.includes('抖音直播弹幕')) {
                const filePath = path.join(jsDir, file);
                const header = await FileHeaderManager.readHeader(filePath);
                // console.log('ds header:', header);
                if (!header || forceHeader) {
                    try {
                        ruleObject = await drpy.getRuleObject(filePath);
                    } catch (e) {
                        throw new Error(`Error parsing rule object for file: ${file}, ${e.message}`);
                    }
                    Object.assign(ruleMeta, {
                        title: ruleObject.title,
                        searchable: ruleObject.searchable,
                        filterable: ruleObject.filterable,
                        quickSearch: ruleObject.quickSearch,
                        more: ruleObject.more,
                        logo: ruleObject.logo,
                        lang: 'ds',
                    });
                    // console.log('ds ruleMeta:', ruleMeta);
                    await FileHeaderManager.writeHeader(filePath, ruleMeta);
                } else {
                    Object.assign(ruleMeta, header);
                }
                if (!isLoaded) {
                    const sizeInBytes = await FileHeaderManager.getFileSize(filePath, {humanReadable: true});
                    console.log(`Loading RuleObject: ${filePath} fileSize:${sizeInBytes}`);
                }
                ruleMeta.title = enableRuleName ? ruleMeta.title || baseName : baseName;

                let fileSites = [];
                if (baseName === 'push_agent') {
                    let key = 'push_agent';
                    let name = `${ruleMeta.title}(DS)`;
                    fileSites.push({key, name});
                } else if (SitesMap.hasOwnProperty(baseName) && Array.isArray(SitesMap[baseName])) {
                    SitesMap[baseName].forEach((it) => {
                        let key = `drpyS_${it.alias}`;
                        let name = `${it.alias}(DS)`;
                        let ext = it.queryObject.type === 'url' ? it.queryObject.params : it.queryStr;
                        if (ext) {
                            ext = jsEncoder.gzip(ext);
                        }
                        fileSites.push({key, name, ext});
                    });
                } else {
                    let key = `drpyS_${ruleMeta.title}`;
                    let name = `${ruleMeta.title}(DS)`;
                    fileSites.push({key, name});
                }

                fileSites.forEach((fileSite) => {
                    const site = {
                        key: fileSite.key,
                        name: fileSite.name,
                        type: 4, // 固定值
                        api,
                        ...ruleMeta,
                        ext: fileSite.ext || "", // 固定为空字符串
                    };
                    sites.push(site);
                });
            },
            param: {file, jsDir, requestHost, pwd, drpy, SitesMap, jsEncoder},
            id: file,
        };
    });

    const listener = {
        func: (param, id, error, result) => {
            if (error) {
                console.error(`Error processing file ${id}:`, error.message);
            } else {
                // console.log(`Successfully processed file ${id}:`, result);
            }
        },
        param: {}, // 外部参数可以在这里传入
    };

    await batchExecute(tasks, listener);

    // 根据用户是否启用dr2源去生成对应配置
    if (ENV.get('enable_dr2', '1') === '1') {
        const dr2_files = readdirSync(dr2Dir);
        let dr2_valid_files = dr2_files.filter((file) => file.endsWith('.js') && !file.startsWith('_')); // 筛选出不是 "_" 开头的 .js 文件
        // log(dr2_valid_files);
        log(`开始生成dr2的t3配置，dr2Dir:${dr2Dir},源数量: ${dr2_valid_files.length}`);

        const dr2_tasks = dr2_valid_files.map((file) => {
            return {
                func: async ({file, dr2Dir, requestHost, pwd, drpy, SitesMap}) => {
                    const baseName = path.basename(file, '.js'); // 去掉文件扩展名
                    // dr2ApiType=0 使用接口drpy2 dr2ApiType=1 使用壳子内置的drpy2
                    let api = dr2ApiType ? `assets://js/lib/drpy2.js` : `${requestHost}/public/drpy/drpy2.min.js`;
                    let ext = `${requestHost}/js/${file}`;
                    if (pwd) {
                        ext += `?pwd=${pwd}`;
                    }
                    let ruleObject = {
                        searchable: 0, // 固定值
                        filterable: 0, // 固定值
                        quickSearch: 0, // 固定值
                    };
                    let ruleMeta = {...ruleObject};
                    const filePath = path.join(dr2Dir, file);
                    const header = await FileHeaderManager.readHeader(filePath);
                    // console.log('dr2 header:', header);
                    if (!header || forceHeader) {
                        try {
                            ruleObject = await drpy.getRuleObject(path.join(filePath));
                        } catch (e) {
                            throw new Error(`Error parsing rule object for file: ${file}, ${e.message}`);
                        }
                        Object.assign(ruleMeta, {
                            title: ruleObject.title,
                            searchable: ruleObject.searchable,
                            filterable: ruleObject.filterable,
                            quickSearch: ruleObject.quickSearch,
                            more: ruleObject.more,
                            logo: ruleObject.logo,
                            lang: 'dr2',
                        });
                        // console.log('dr2 ruleMeta:', ruleMeta);
                        await FileHeaderManager.writeHeader(filePath, ruleMeta);
                    } else {
                        Object.assign(ruleMeta, header);
                    }
                    if (!isLoaded) {
                        const sizeInBytes = await FileHeaderManager.getFileSize(filePath, {humanReadable: true});
                        console.log(`Loading RuleObject: ${filePath} fileSize:${sizeInBytes}`);
                    }
                    ruleMeta.title = enableRuleName ? ruleMeta.title || baseName : baseName;

                    let fileSites = [];
                    if (baseName === 'push_agent') {
                        let key = 'push_agent';
                        let name = `${ruleMeta.title}(DR2)`;
                        fileSites.push({key, name, ext});
                    } else if (SitesMap.hasOwnProperty(baseName) && Array.isArray(SitesMap[baseName])) {
                        SitesMap[baseName].forEach((it) => {
                            let key = `drpy2_${it.alias}`;
                            let name = `${it.alias}(DR2)`;
                            let _ext = updateQueryString(ext, it.queryStr);
                            fileSites.push({key, name, ext: _ext});
                        });
                    } else {
                        let key = `drpy2_${ruleMeta.title}`;
                        let name = `${ruleMeta.title}(DR2)`;
                        fileSites.push({key, name, ext});
                    }

                    fileSites.forEach((fileSite) => {
                        const site = {
                            key: fileSite.key,
                            name: fileSite.name,
                            type: 3, // 固定值
                            api,
                            ...ruleMeta,
                            ext: fileSite.ext || "", // 固定为空字符串
                        };
                        sites.push(site);
                    });
                },
                param: {file, dr2Dir, requestHost, pwd, drpy, SitesMap},
                id: file,
            };
        });

        await batchExecute(dr2_tasks, listener);

    }

    // 根据用户是否启用py源去生成对应配置
    if (ENV.get('enable_py', '1') === '1') {
        const py_files = readdirSync(pyDir);
        let py_valid_files = py_files.filter((file) => file.endsWith('.py') && !file.startsWith('_')); // 筛选出不是 "_" 开头的 .py 文件
        // log(py_valid_files);
        log(`开始生成python的t3配置，pyDir:${pyDir},源数量: ${py_valid_files.length}`);

        const py_tasks = py_valid_files.map((file) => {
            return {
                func: async ({file, pyDir, requestHost, pwd, SitesMap}) => {
                    const baseName = path.basename(file, '.py'); // 去掉文件扩展名
                    const extJson = path.join(pyDir, baseName + '.json');
                    let api = `${requestHost}/py/${file}`;
                    let ext = existsSync(extJson) ? `${requestHost}/py/${file}` : '';
                    if (pwd) {
                        api += `?pwd=${pwd}`;
                        if (ext) {
                            ext += `?pwd=${pwd}`;
                        }
                    }
                    let ruleObject = {
                        searchable: 1, // 固定值
                        filterable: 1, // 固定值
                        quickSearch: 1, // 固定值
                    };
                    let ruleMeta = {...ruleObject};
                    const filePath = path.join(pyDir, file);
                    const header = await FileHeaderManager.readHeader(filePath);
                    // console.log('py header:', header);
                    if (!header || forceHeader) {
                        const fileContent = await readFile(filePath, 'utf-8');
                        const title = extractNameFromCode(fileContent) || baseName;
                        Object.assign(ruleMeta, {
                            title: title,
                            lang: 'hipy',
                        });
                        // console.log('py ruleMeta:', ruleMeta);
                        await FileHeaderManager.writeHeader(filePath, ruleMeta);
                    } else {
                        Object.assign(ruleMeta, header);
                    }
                    if (!isLoaded) {
                        const sizeInBytes = await FileHeaderManager.getFileSize(filePath, {humanReadable: true});
                        console.log(`Loading RuleObject: ${filePath} fileSize:${sizeInBytes}`);
                    }
                    ruleMeta.title = enableRuleName ? ruleMeta.title || baseName : baseName;

                    let fileSites = [];
                    if (baseName === 'push_agent') {
                        let key = 'push_agent';
                        let name = `${ruleMeta.title}(hipy)`;
                        fileSites.push({key, name, ext});
                    } else if (SitesMap.hasOwnProperty(baseName) && Array.isArray(SitesMap[baseName])) {
                        SitesMap[baseName].forEach((it) => {
                            let key = `hipy_py_${it.alias}`;
                            let name = `${it.alias}(hipy)`;
                            let _ext = updateQueryString(ext, it.queryStr);
                            fileSites.push({key, name, ext: _ext});
                        });
                    } else {
                        let key = `hipy_py_${ruleMeta.title}`;
                        let name = `${ruleMeta.title}(hipy)`;
                        fileSites.push({key, name, ext});
                    }

                    fileSites.forEach((fileSite) => {
                        const site = {
                            key: fileSite.key,
                            name: fileSite.name,
                            type: 3, // 固定值
                            api,
                            ...ruleMeta,
                            ext: fileSite.ext || "", // 固定为空字符串
                        };
                        sites.push(site);
                    });
                },
                param: {file, pyDir, requestHost, pwd, SitesMap},
                id: file,
            };
        });

        await batchExecute(py_tasks, listener);

    }

    // 根据用户是否启用挂载数据源去生成对应配置
    if (ENV.get('enable_link_data', '0') === '1') {
        log(`开始挂载外部T4数据`);
        let link_sites = [];
        let link_url = ENV.get('link_url');
        let enable_link_push = ENV.get('enable_link_push', '0');
        let enable_link_jar = ENV.get('enable_link_jar', '0');
        try {
            let link_data = readFileSync(path.join(rootDir, './data/settings/link_data.json'), 'utf-8');
            let link_config = JSON.parse(link_data);
            link_sites = link_config.sites.filter(site => site.type = 4);
            if (link_config.spider && enable_link_jar === '1') {
                let link_spider_arr = link_config.spider.split(';');
                link_jar = urljoin(link_url, link_spider_arr[0]);
                if (link_spider_arr.length > 1) {
                    link_jar = [link_jar].concat(link_spider_arr.slice(1)).join(';')
                }
                log(`开始挂载外部T4 Jar: ${link_jar}`);
            }
            link_sites.forEach((site) => {
                if (site.key === 'push_agent' && enable_link_push !== '1') {
                    return
                }
                if (site.api && !site.api.startsWith('http')) {
                    site.api = urljoin(link_url, site.api)
                }
                if (site.ext && site.ext.startsWith('.')) {
                    site.ext = urljoin(link_url, site.ext)
                }
                if (site.key === 'push_agent' && enable_link_push === '1') { // 推送覆盖
                    let pushIndex = sites.findIndex(s => s.key === 'push_agent');
                    if (pushIndex > -1) {
                        sites[pushIndex] = site;
                    } else {
                        sites.push(site);
                    }
                } else {
                    sites.push(site);
                }
            });
        } catch (e) {
        }
    }

    // 订阅再次处理别名的情况
    if (sub) {
        if (sub.mode === 0) {
            sites = sites.filter(it => (new RegExp(sub.reg || '.*')).test(it.name));
        } else if (sub.mode === 1) {
            sites = sites.filter(it => !(new RegExp(sub.reg || '.*')).test(it.name));
        }
    }
    // 青少年模式再次处理自定义别名的情况
    if (ENV.get('hide_adult') === '1') {
        sites = sites.filter(it => !(new RegExp('\\[[密]\\]|密+')).test(it.name));
    }
    sites = naturalSort(sites, 'name', sort_list);
    return {sites, spider: link_jar};
}

async function generateParseJSON(jxDir, requestHost) {
    const files = readdirSync(jxDir);
    const jx_files = files.filter((file) => file.endsWith('.js') && !file.startsWith('_')) // 筛选出不是 "_" 开头的 .js 文件
    const jx_dict = getParsesDict(requestHost);
    let parses = [];
    const tasks = jx_files.map((file) => {
        return {
            func: async ({file, jxDir, requestHost, drpy}) => {
                const baseName = path.basename(file, '.js'); // 去掉文件扩展名
                const api = `${requestHost}/parse/${baseName}?url=`;  // 使用请求的 host 地址，避免硬编码端口

                let jxObject = {
                    type: 1, // 固定值
                    ext: {
                        flag: [
                            "qiyi",
                            "imgo",
                            "爱奇艺",
                            "奇艺",
                            "qq",
                            "qq 预告及花絮",
                            "腾讯",
                            "youku",
                            "优酷",
                            "pptv",
                            "PPTV",
                            "letv",
                            "乐视",
                            "leshi",
                            "mgtv",
                            "芒果",
                            "sohu",
                            "xigua",
                            "fun",
                            "风行"
                        ]
                    },
                    header: {
                        "User-Agent": "Mozilla/5.0"
                    }
                };
                try {
                    let _jxObject = await drpy.getJx(path.join(jxDir, file));
                    jxObject = {...jxObject, ..._jxObject};
                } catch (e) {
                    throw new Error(`Error parsing jx object for file: ${file}, ${e.message}`);
                }

                parses.push({
                    name: baseName,
                    url: jxObject.url || api,
                    type: jxObject.type,
                    ext: jxObject.ext,
                    header: jxObject.header
                });
            },
            param: {file, jxDir, requestHost, drpy},
            id: file,
        };
    });

    const listener = {
        func: (param, id, error, result) => {
            if (error) {
                console.error(`Error processing file ${id}:`, error.message);
            } else {
                // console.log(`Successfully processed file ${id}:`, result);
            }
        },
        param: {}, // 外部参数可以在这里传入
    };
    await batchExecute(tasks, listener);
    let sorted_parses = naturalSort(parses, 'name', ['JSON并发', 'JSON合集', '虾米', '奇奇']);
    let sorted_jx_dict = naturalSort(jx_dict, 'name', ['J', 'W']);
    parses = sorted_parses.concat(sorted_jx_dict);
    return {parses};
}

function generateLivesJSON(requestHost) {
    let lives = [];
    let live_url = process.env.LIVE_URL || '';
    let epg_url = process.env.EPG_URL || ''; // 从.env文件读取
    let logo_url = process.env.LOGO_URL || ''; // 从.env文件读取
    if (live_url && !live_url.startsWith('http')) {
        let public_url = urljoin(requestHost, 'public/');
        live_url = urljoin(public_url, live_url);
    }
    // console.log('live_url:', live_url);
    if (live_url) {
        lives.push(
            {
                "name": "直播",
                "type": 0,
                "url": live_url,
                "playerType": 1,
                "ua": "okhttp/3.12.13",
                "epg": epg_url,
                "logo": logo_url
            }
        )
    }
    return {lives}
}

function generatePlayerJSON(configDir, requestHost) {
    let playerConfig = {};
    let playerConfigPath = path.join(configDir, './player.json');
    if (existsSync(playerConfigPath)) {
        try {
            playerConfig = JSON.parse(readFileSync(playerConfigPath, 'utf-8'))
        } catch (e) {

        }
    }
    return playerConfig
}

function getSubs(subFilePath) {
    let subs = [];
    try {
        const subContent = readFileSync(subFilePath, 'utf-8');
        subs = JSON.parse(subContent)
    } catch (e) {
        console.log(`读取订阅失败:${e.message}`);
    }
    return subs
}

export default (fastify, options, done) => {

    fastify.get('/index', {preHandler: validatePwd}, async (request, reply) => {
        if (!existsSync(options.indexFilePath)) {
            reply.code(404).send({error: 'index.json not found'});
            return;
        }

        const content = readFileSync(options.indexFilePath, 'utf-8');
        reply.send(JSON.parse(content));
    });

    // 接口：返回配置 JSON，同时写入 index.json
    fastify.get('/config*', {preHandler: [validatePwd, validateBasicAuth]}, async (request, reply) => {
        let t1 = (new Date()).getTime();
        const query = request.query; // 获取 query 参数
        const pwd = query.pwd || '';
        const sub_code = query.sub || '';
        const cfg_path = request.params['*']; // 捕获整个路径
        try {
            // 获取主机名，协议及端口
            const protocol = request.headers['x-forwarded-proto'] || (request.socket.encrypted ? 'https' : 'http');  // http 或 https
            const hostname = request.hostname;  // 主机名，不包含端口
            const port = request.socket.localPort;  // 获取当前服务的端口
            console.log(`cfg_path:${cfg_path},port:${port}`);
            let not_local = cfg_path.startsWith('/1') || cfg_path.startsWith('/index');
            let requestHost = not_local ? `${protocol}://${hostname}` : `http://127.0.0.1:${options.PORT}`; // 动态生成根地址
            let requestUrl = not_local ? `${protocol}://${hostname}${request.url}` : `http://127.0.0.1:${options.PORT}${request.url}`; // 动态生成请求链接
            // console.log('requestUrl:', requestUrl);
            // if (cfg_path.endsWith('.js')) {
            //     if (cfg_path.includes('index.js')) {
            //         // return reply.sendFile('index.js', path.join(options.rootDir, 'data/cat'));
            //         let content = readFileSync(path.join(options.rootDir, 'data/cat/index.js'), 'utf-8');
            //         // content = jinja.render(content, {config_url: requestUrl.replace(cfg_path, `/1?sub=all&pwd=${process.env.API_PWD || ''}`)});
            //         content = content.replace('$config_url', requestUrl.replace(cfg_path, `/1?sub=all&pwd=${process.env.API_PWD || ''}`));
            //         return reply.type('application/javascript;charset=utf-8').send(content);
            //     } else if (cfg_path.includes('index.config.js')) {
            //         let content = readFileSync(path.join(options.rootDir, 'data/cat/index.config.js'), 'utf-8');
            //         // content = jinja.render(content, {config_url: requestUrl.replace(cfg_path, `/1?sub=all&pwd=${process.env.API_PWD || ''}`)});
            //         content = content.replace('$config_url', requestUrl.replace(cfg_path, `/1?sub=all&pwd=${process.env.API_PWD || ''}`));
            //         return reply.type('application/javascript;charset=utf-8').send(content);
            //     }
            // }
            // if (cfg_path.endsWith('.js.md5')) {
            //     if (cfg_path.includes('index.js')) {
            //         let content = readFileSync(path.join(options.rootDir, 'data/cat/index.js'), 'utf-8');
            //         // content = jinja.render(content, {config_url: requestUrl.replace(cfg_path, `/1?sub=all&pwd=${process.env.API_PWD || ''}`)});
            //         content = content.replace('$config_url', requestUrl.replace(cfg_path, `/1?sub=all&pwd=${process.env.API_PWD || ''}`));
            //         let contentHash = md5(content);
            //         console.log('index.js contentHash:', contentHash);
            //         return reply.type('text/plain;charset=utf-8').send(contentHash);
            //     } else if (cfg_path.includes('index.config.js')) {
            //         let content = readFileSync(path.join(options.rootDir, 'data/cat/index.config.js'), 'utf-8');
            //         // content = jinja.render(content, {config_url: requestUrl.replace(cfg_path, `/1?sub=all&pwd=${process.env.API_PWD || ''}`)});
            //         content = content.replace('$config_url', requestUrl.replace(cfg_path, `/1?sub=all&pwd=${process.env.API_PWD || ''}`));
            //         let contentHash = md5(content);
            //         console.log('index.config.js contentHash:', contentHash);
            //         return reply.type('text/plain;charset=utf-8').send(contentHash);
            //     }
            // }
            const getFilePath = (cfgPath, rootDir, fileName) => path.join(rootDir, `data/cat/${fileName}`);
            const processContent = (content, cfgPath, requestUrl) =>
                content.replace('$config_url', requestUrl.replace(cfgPath, `/1?sub=all&pwd=${process.env.API_PWD || ''}`));

            const handleJavaScript = (cfgPath, requestUrl, options, reply) => {
                const fileMap = {
                    'index.js': 'index.js',
                    'index.config.js': 'index.config.js'
                };

                for (const [key, fileName] of Object.entries(fileMap)) {
                    if (cfgPath.includes(key)) {
                        const filePath = getFilePath(cfgPath, options.rootDir, fileName);
                        let content = readFileSync(filePath, 'utf-8');
                        content = processContent(content, cfgPath, requestUrl);
                        return reply.type('application/javascript;charset=utf-8').send(content);
                    }
                }
            };

            const handleJsMd5 = (cfgPath, requestUrl, options, reply) => {
                const fileMap = {
                    'index.js': 'index.js',
                    'index.config.js': 'index.config.js'
                };

                for (const [key, fileName] of Object.entries(fileMap)) {
                    if (cfgPath.includes(key)) {
                        const filePath = getFilePath(cfgPath, options.rootDir, fileName);
                        let content = readFileSync(filePath, 'utf-8');
                        content = processContent(content, cfgPath, requestUrl);
                        const contentHash = md5(content);
                        console.log(`${fileName} contentHash:`, contentHash);
                        return reply.type('text/plain;charset=utf-8').send(contentHash);
                    }
                }
            };
            if (cfg_path.endsWith('.js')) {
                return handleJavaScript(cfg_path, requestUrl, options, reply);
            }

            if (cfg_path.endsWith('.js.md5')) {
                return handleJsMd5(cfg_path, requestUrl, options, reply);
            }
            let sub = null;
            if (sub_code) {
                let subs = getSubs(options.subFilePath);
                sub = subs.find(it => it.code === sub_code);
                // console.log('sub:', sub);
                if (sub && sub.status === 0) {
                    return reply.status(500).send({error: `此订阅码:【${sub_code}】已禁用`});
                }
            }

            const siteJSON = await generateSiteJSON(options, requestHost, sub, pwd);
            const parseJSON = await generateParseJSON(options.jxDir, requestHost);
            const livesJSON = generateLivesJSON(requestHost);
            const playerJSON = generatePlayerJSON(options.configDir, requestHost);
            const configObj = {sites_count: siteJSON.sites.length, ...playerJSON, ...siteJSON, ...parseJSON, ...livesJSON};
            if (!configObj.spider) {
                configObj.spider = playerJSON.spider
            }
            // console.log(configObj);
            const configStr = JSON.stringify(configObj, null, 2);
            if (!process.env.VERCEL) { // Vercel 环境不支持写文件，关闭此功能
                writeFileSync(options.indexFilePath, configStr, 'utf8'); // 写入 index.json
                if (cfg_path === '/1') {
                    writeFileSync(options.customFilePath, configStr, 'utf8'); // 写入 index.json
                }
            }
            let t2 = (new Date()).getTime();
            let cost = t2 - t1;
            // configObj.cost = cost;
            // reply.send(configObj);
            reply.send(Object.assign({cost}, configObj));
        } catch (error) {
            reply.status(500).send({error: 'Failed to generate site JSON', details: error.message});
        }
    });

    // 接口：返回配置 JSON
    fastify.get('/tbox*', {preHandler: [validatePwd, validateBasicAuth]}, async (request, reply) => {
        let t1 = (new Date()).getTime();
        const query = request.query; // 获取 query 参数
        const pwd = query.pwd || '';
        const sub_code = query.sub || '';
        const cfg_path = request.params['*']; // 捕获整个路径
        try {
            // 获取主机名，协议及端口
            const protocol = request.headers['x-forwarded-proto'] || (request.socket.encrypted ? 'https' : 'http');  // http 或 https
            const hostname = request.hostname;  // 主机名，不包含端口
            const port = request.socket.localPort;  // 获取当前服务的端口
            console.log(`cfg_path:${cfg_path},port:${port}`);
            let not_local = cfg_path.startsWith('/1') || cfg_path.startsWith('/index');
            let requestHost = not_local ? `${protocol}://${hostname}` : `http://127.0.0.1:${options.PORT}`; // 动态生成根地址
           let requestUrl = not_local ? `${protocol}://${hostname}${request.url}` : `http://127.0.0.1:${options.PORT}${request.url}`; // 动态生成请求链接
            const handleJavaScript = (cfgPath, requestUrl, options, reply) => {
                if (cfgPath.includes('tbox.js')) {
                    let content = Buffer.from('Y29uc3Qgd2ViU2l0ZSA9ICcnOw0KDQphc3luYyBmdW5jdGlvbiBjYXRlZ29yeUNvbnRlbnQodGlkLCBwZyA9IDEsIGV4dGVuZCkgew0KICBjb25zdCBiYWNrRGF0YSA9IG5ldyBSZXBWaWRlbygpOw0KICB0cnkgew0KICAgIGZ1bmN0aW9uIGVuY29kZUJhc2U2NChpbnB1dCkgew0KICAgICAgY29uc3Qgd29yZEFycmF5ID0gQ3J5cHRvLmVuYy5VdGY4LnBhcnNlKGlucHV0KTsNCiAgICAgIGNvbnN0IGJhc2U2NCA9IENyeXB0by5lbmMuQmFzZTY0LnN0cmluZ2lmeSh3b3JkQXJyYXkpOw0KICAgICAgcmV0dXJuIGJhc2U2NDsNCiAgICB9DQogICAgY29uc3Qgc2VwYXJhdG9yID0gd2ViU2l0ZS5pbmNsdWRlcygnPycpID8gJyYnIDogJz8nOw0KICAgIGxldCB1cmwgPSBgJHt3ZWJTaXRlfSR7c2VwYXJhdG9yfWFjPWRldGFpbCZ0PSR7ZW5jb2RlVVJJQ29tcG9uZW50KHRpZCl9JnBnPSR7cGd9YDsNCiAgICBpZiAoZXh0ZW5kKSB7DQogICAgICB1cmwgKz0gYCZleHQ9JHtlbmNvZGVVUklDb21wb25lbnQoZW5jb2RlQmFzZTY0KGV4dGVuZCkpfWA7DQogICAgfQ0KICAgIGNvbnNvbGUubG9nKHVybCk7DQogICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCByZXEodXJsKTsNCiAgICBjb25zdCByZXNEYXRhID0gYXdhaXQgcmVzcG9uc2UuanNvbigpOw0KICAgIGlmIChyZXNEYXRhPy5saXN0KSBiYWNrRGF0YS5saXN0ID0gcmVzRGF0YS5saXN0Ow0KICB9IGNhdGNoIChlcnJvcikgew0KICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGluIGNhdGVnb3J5Q29udGVudDonLCBlcnJvcik7DQogICAgYmFja0RhdGEubXNnID0gZXJyb3IubWVzc2FnZTsNCiAgICBhd2FpdCB0b2FzdChg6I635Y+W5YiG57G75pWw5o2u5aSx6LSl77yaJHtiYWNrRGF0YS5tc2d9YCwzKTsNCiAgfQ0KICBjb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeShiYWNrRGF0YSkpOw0KICByZXR1cm4gSlNPTi5zdHJpbmdpZnkoYmFja0RhdGEpOw0KfQ0KDQoNCg0KDQphc3luYyBmdW5jdGlvbiBkZXRhaWxDb250ZW50KGlkcykgew0KICBjb25zdCBiYWNrRGF0YSA9IG5ldyBSZXBWaWRlbygpOw0KICB0cnkgew0KICAgIGNvbnN0IHNlcGFyYXRvciA9IHdlYlNpdGUuaW5jbHVkZXMoJz8nKSA/ICcmJyA6ICc/JzsNCiAgICBjb25zdCB1cmwgPSBgJHt3ZWJTaXRlfSR7c2VwYXJhdG9yfWFjPWRldGFpbCZpZHM9JHtlbmNvZGVVUklDb21wb25lbnQoaWRzKX1gOw0KICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgcmVxKHVybCk7DQogICAgY29uc3QgcmVzcG9uc2VEYXRhID0gYXdhaXQgcmVzcG9uc2UudGV4dCgpOw0KICAgIGNvbnNvbGUubG9nKHJlc3BvbnNlRGF0YSk7DQogICAgcmV0dXJuIHJlc3BvbnNlRGF0YTsNCiAgfSBjYXRjaCAoZXJyb3IpIHsNCiAgICBjb25zb2xlLmVycm9yKCdFcnJvciBpbiBkZXRhaWxDb250ZW50OicsIGVycm9yKTsNCiAgICBiYWNrRGF0YS5tc2cgPSBlcnJvci5tZXNzYWdlIHx8IGVycm9yLnN0YXR1c1RleHQgfHwgJ1Vua25vd24gZXJyb3InOw0KICAgIGF3YWl0IHRvYXN0KGDojrflj5bor6bmg4XlpLHotKXvvJoke2JhY2tEYXRhLm1zZ31gLDMpOw0KICB9DQogIGNvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KGJhY2tEYXRhKSk7DQogIHJldHVybiBKU09OLnN0cmluZ2lmeShiYWNrRGF0YSk7DQp9DQoNCg0KDQphc3luYyBmdW5jdGlvbiBob21lQ29udGVudCgpIHsNCiAgY29uc3QgYmFja0RhdGEgPSBuZXcgUmVwVmlkZW8oKTsNCiAgdHJ5IHsNCiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHJlcSh3ZWJTaXRlKTsNCiAgICBjb25zdCByZXNEYXRhID0gYXdhaXQgcmVzcG9uc2UuanNvbigpOw0KICAgIGlmIChyZXNEYXRhPy5jbGFzcykgYmFja0RhdGEuY2xhc3MgPSByZXNEYXRhLmNsYXNzOw0KICAgIGlmIChyZXNEYXRhPy5maWx0ZXJzKSBiYWNrRGF0YS5maWx0ZXJzID0gcmVzRGF0YS5maWx0ZXJzOw0KICAgIGlmIChyZXNEYXRhPy5saXN0KSBiYWNrRGF0YS5saXN0ID0gcmVzRGF0YS5saXN0Ow0KICB9IGNhdGNoIChlcnJvcikgew0KICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGluIGhvbWVDb250ZW50OicsIGVycm9yKTsNCiAgICBiYWNrRGF0YS5tc2cgPSBlcnJvci5zdGF0dXNUZXh0IHx8IGVycm9yLm1lc3NhZ2UgfHwgJ1Vua25vd24gZXJyb3InOw0KICAgIGF3YWl0IHRvYXN0KGDliqDovb3pppbpobXlpLHotKXvvJoke2JhY2tEYXRhLm1zZ31gLDMpOw0KICB9DQogIGNvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KGJhY2tEYXRhKSk7DQogIHJldHVybiBKU09OLnN0cmluZ2lmeShiYWNrRGF0YSk7DQp9DQoNCg0KDQoNCmFzeW5jIGZ1bmN0aW9uIHNlYXJjaENvbnRlbnQoa2V5d29yZCkgew0KICBjb25zdCBiYWNrRGF0YSA9IG5ldyBSZXBWaWRlbygpOw0KICB0cnkgew0KICAgIGNvbnN0IHNlcGFyYXRvciA9IHdlYlNpdGUuaW5jbHVkZXMoJz8nKSA/ICcmJyA6ICc/JzsNCiAgICBjb25zdCB1cmwgPSBgJHt3ZWJTaXRlfSR7c2VwYXJhdG9yfXdkPSR7ZW5jb2RlVVJJQ29tcG9uZW50KGtleXdvcmQpfSZwZz0xYDsNCiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHJlcSh1cmwpOw0KICAgIGNvbnN0IHByb0RhdGEgPSBhd2FpdCByZXNwb25zZS5qc29uKCk7DQogICAgaWYgKHByb0RhdGE/Lmxpc3QpIGJhY2tEYXRhLmxpc3QgPSBwcm9EYXRhLmxpc3Q7DQogIH0gY2F0Y2ggKGVycm9yKSB7DQogICAgY29uc29sZS5lcnJvcignRXJyb3IgaW4gc2VhcmNoQ29udGVudDonLCBlcnJvcik7DQogICAgYmFja0RhdGEubXNnID0gZXJyb3Iuc3RhdHVzVGV4dCB8fCBlcnJvci5tZXNzYWdlIHx8ICdVbmtub3duIGVycm9yJzsNCiAgfQ0KICBjb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeShiYWNrRGF0YSkpOw0KICByZXR1cm4gSlNPTi5zdHJpbmdpZnkoYmFja0RhdGEpOw0KfQ0KDQoNCg0KDQphc3luYyBmdW5jdGlvbiBwbGF5ZXJDb250ZW50KHZvZF9pZCwgZmxhZykgew0KICBjb25zdCBiYWNrRGF0YSA9IG5ldyBSZXBWaWRlb1BsYXlVcmwoKTsNCiAgdHJ5IHsNCiAgICBjb25zdCBzZXBhcmF0b3IgPSB3ZWJTaXRlLmluY2x1ZGVzKCc/JykgPyAnJicgOiAnPyc7DQogICAgY29uc3QgdXJsID0gYCR7d2ViU2l0ZX0ke3NlcGFyYXRvcn1mbGFnPSR7ZW5jb2RlVVJJQ29tcG9uZW50KGZsYWcpfSZwbGF5PSR7ZW5jb2RlVVJJQ29tcG9uZW50KHZvZF9pZCl9YDsNCiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHJlcSh1cmwpOw0KICAgIGNvbnN0IHByb0RhdGEgPSBhd2FpdCByZXNwb25zZS5qc29uKCk7DQogICAgYmFja0RhdGEuaGVhZGVyID0gaGVhZGVyc1RvU3RyaW5nKHByb0RhdGEuaGVhZGVyIHx8IHt9KTsNCiAgICAvLyDlpITnkIYg6YGT6ZW/55qEdXJsDQogICAgaWYgKEFycmF5LmlzQXJyYXkocHJvRGF0YS51cmwpKSB7DQogICAgICBsZXQgc2VsZWN0ZWRVcmwgPSAnJzsNCiAgICAgIC8vIOafpeaJvuaYr+WQpuWMheWQqyAi5Y6f55S7Ig0KICAgICAgY29uc3Qgb3JpZ2luYWxJbmRleCA9IHByb0RhdGEudXJsLmluZGV4T2YoJ+WOn+eUuycpOw0KICAgICAgaWYgKG9yaWdpbmFsSW5kZXggIT09IC0xICYmIG9yaWdpbmFsSW5kZXggKyAxIDwgcHJvRGF0YS51cmwubGVuZ3RoKSB7DQogICAgICAgIC8vIOWmguaenOWMheWQqyAi5Y6f55S7Iu+8jOWPliAi5Y6f55S7IiDlkI7pnaLnmoQgVVJMDQogICAgICAgIHNlbGVjdGVkVXJsID0gcHJvRGF0YS51cmxbb3JpZ2luYWxJbmRleCArIDFdOw0KICAgICAgfSBlbHNlIHsNCiAgICAgICAgLy8g5aaC5p6c5LiN5YyF5ZCrICLljp/nlLsi77yM5LuO5LiK5b6A5LiL5om+5Yiw56ys5LiA5LiqIGh0dHAg5byA5aS055qEIFVSTA0KICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHByb0RhdGEudXJsLmxlbmd0aDsgaSsrKSB7DQogICAgICAgICAgaWYgKHR5cGVvZiBwcm9EYXRhLnVybFtpXSA9PT0gJ3N0cmluZycgJiYgcHJvRGF0YS51cmxbaV0uc3RhcnRzV2l0aCgnaHR0cCcpKSB7DQogICAgICAgICAgICBzZWxlY3RlZFVybCA9IHByb0RhdGEudXJsW2ldOw0KICAgICAgICAgICAgYnJlYWs7DQogICAgICAgICAgfQ0KICAgICAgICB9DQogICAgICB9DQogICAgICBiYWNrRGF0YS51cmwgPSBzZWxlY3RlZFVybDsNCiAgICB9IGVsc2Ugew0KICAgICAgYmFja0RhdGEudXJsID0gcHJvRGF0YS51cmw7IC8vIOWmguaenOS4jeaYr+aVsOe7hO+8jOebtOaOpeWPliBVUkwNCiAgICB9DQogICAgYmFja0RhdGEucGFyc2UgPSBwcm9EYXRhLnBhcnNlID09PSAxID8gMCA6IHByb0RhdGEucGFyc2UgPT09IDAgPyAxIDogMTsNCiAgfSBjYXRjaCAoZXJyb3IpIHsNCiAgICBjb25zb2xlLmVycm9yKCdFcnJvciBpbiBwbGF5ZXJDb250ZW50OicsIGVycm9yKTsNCiAgICBiYWNrRGF0YS51cmwgPSAnJzsgDQogICAgYmFja0RhdGEucGFyc2UgPSAxOw0KICAgIGJhY2tEYXRhLm1zZyA9IGVycm9yLm1lc3NhZ2UgfHwgJ1Vua25vd24gZXJyb3InOyANCiAgICBhd2FpdCB0b2FzdChg6Kej5p6Q5pKt5pS+6ZO+5o6l5aSx6LSl77yaJHtiYWNrRGF0YS5tc2d9YCwgMyk7DQogIH0NCiAgY29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkoYmFja0RhdGEpKTsNCiAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KGJhY2tEYXRhKTsNCn0NCg==', 'base64').toString('utf-8');
                        return reply.type('text/javascript; charset=utf-8').send(content);
                }
            };
            if (cfg_path.endsWith('.js')) {
                return handleJavaScript(cfg_path, requestUrl, options, reply);
            }
            let sub = null;
            if (sub_code) {
                let subs = getSubs(options.subFilePath);
                sub = subs.find(it => it.code === sub_code);
                // console.log('sub:', sub);
                if (sub && sub.status === 0) {
                    return reply.status(500).send({error: `此订阅码:【${sub_code}】已禁用`});
                }
            }
            const siteJSON = await generateSiteJSON(options, requestHost, sub, pwd);
            const parseJSON = await generateParseJSON(options.jxDir, requestHost);
            const livesJSON = generateLivesJSON(requestHost);
            const playerJSON = generatePlayerJSON(options.configDir, requestHost);
            const configObj = {sites_count: siteJSON.sites.length, ...playerJSON, ...siteJSON, ...parseJSON, ...livesJSON};
            if (!configObj.spider) {
                configObj.spider = playerJSON.spider
            }
            // console.log(configObj);
            const filteredSites = configObj.sites
                .filter(site => site.type === 4 && !site.name.includes('[书]')) // 过滤掉 type 为 4 且 name 不包含 [书] 的站点
                .map(site => ({
                    key: md5(site.key),
                    name: site.name,
                    type: 5,
                    searchable: site.searchable === 1 || site.searchable === 2 ? 1 : 0,
                    filterClass: "",
                    firstClass: "",
                    filterPlay: "",
                    firstPlay: "",
                    ext: requestHost + "/tbox/tbox.js", 
                    flagable: site.name.includes('[官]') ? 1 : 0,
                    filterPlayFileKeywords: "",
                    keepPlayFileKeywords: "",
                    webSite: site.api
                }));
            let flags = [];
            const transformedParses = configObj.parses.map(parse => {
                // 如果 parse.ext.flag 为空，则将 parse.name 添加到 flag 中
                const flag = parse.ext?.flag || [];
                if (flag.length === 0) {
                    flag.push(parse.name);
                }
                // 将 flag 数组中的值遍历并添加到 flags 中，同时去重
                flag.forEach(f => {
                    if (!flags.includes(f)) {
                        flags.push(f);
                    }
                });
                return {
                    name: parse.name, 
                    type: parse.type >= 1 ? 1 : 0, 
                    url: parse.url, 
                    ext: {
                        flag: flag,
                        header: parse.header || {} 
                    }
                };
            });
            const result = {
                sites: filteredSites, 
                parses: transformedParses, 
                flags: flags 
            };
            const configStr = JSON.stringify(result, null, 2);
            if (!process.env.VERCEL) { 
                writeFileSync(options.indexFilePath, configStr, 'utf8'); 
                if (cfg_path === '/1') {
                    writeFileSync(options.customFilePath, configStr, 'utf8'); 
                }
            }
            return reply.type('application/json').send(configStr);
        } catch (error) {
            reply.status(500).send({error: 'Failed to generate site JSON', details: error.message});
        }
    });
    
    done();
};
