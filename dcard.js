const axios = require("axios");
const HttpProxyAgent = require("http-proxy-agent");
const HttpsProxyAgent = require("https-proxy-agent");
const cheerio = require("cheerio");
const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({
        headless: "new", 
        slowMo: 100,
        args: [
        "-no-sandbox",
        "--disable-extensions"
        ],
    });
    const page = await browser.newPage();
    await page.setViewport({
        width: 1200,
        height: 800
    });
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36");
    const dcard_topic_ids = await GetDcardIds("ccu");
    console.log(dcard_topic_ids);
    console.log(DcardCrawler(""))
    await page.close();
    await browser.close();
})();

async function GetDcardIds(board) {
    const url = ("https://www.dcard.tw/service/api/v2/forums/" + board + "/posts?limit=60");
    const proxy = "Powered by ZenRows";
    const httpAgent = new HttpProxyAgent(proxy);
    const httpsAgent = new HttpsProxyAgent(proxy);
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    let ids = [];
    try {
        const response = await axios({
            url,
            httpAgent,
            httpsAgent,
            method: "GET",
        });
        const $ = cheerio.load(response.data);
        let current = new Date();
        current.setMinutes(0);
        current.setSeconds(0);
        const after = current.setMilliseconds(0);
        const before = current.setHours(current.getHours() - 12);
        let json = $("pre").text();
        json = JSON.parse(json);
        for(topic of json) {
            const created_time = new Date(topic["createdAt"]).getTime();
            if(created_time < before) {
                break;
            }
            if(created_time > after) {
                continue;
            }
            ids.push(topic["id"]);
        }
    }
    catch(error) {
        console.log(error);
    }
    return ids;
}

async function DcardCrawler(page, board, id) {
    const url = "https://www.dcard.tw/f/" + board + "/p/" + id;
    await page.goto(url);
    const author_class = ".atm_cs_eah1ws.atm_c8_1fp5eut.atm_g3_tiqtbz.atm_vv_1q9ccgz.atm_sq_1l2sidv.atm_ks_15vqwwr.atm_7l_1e0g2gl.a12lr2bo";
    const title_class = ".atm_cs_1udz34.atm_c8_m60yjw.atm_g3_1dsg14k.atm_w6_1hnarqo.atm_7l_1e0g2gl.tipaz8j";
    const time_class = ".atm_7l_1w35wrm.atm_vv_1q9ccgz.atm_sq_1l2sidv.atm_ks_15vqwwr.atm_11ec84c_17s1f44.atm_5oq6dp_awxwf5.ifw06em > time";
    const contents_class = ".atm_c8_exct8b.atm_g3_1f4h9lt.atm_7l_1u09hbr.c1h57ajp > .atm_vv_1btx8ck.atm_w4_1hnarqo.c1ehvwc9 > span";
    const old_to_new_class = ".atm_26_4t66r8.atm_1qrujw7_1x4eueo.atm_9s_116y0ak.atm_h_1h6ojuz.atm_fc_1h6ojuz.atm_1s_glywfm.atm_uc_q8loe9.atm_mk_h2mmj6.atm_kd_glywfm.atm_vb_glywfm.atm_3f_glywfm.atm_l8_1jvvdbw.atm_rd_glywfm.atm_cs_bfngof.atm_9j_tlke0l.atm_18yqj6q_13gfvf7.atm_1ksgpba_i2wt44.atm_9i962p_exct8b.atm_1f62j80_dlk8xv.atm_c8_187sfk0.atm_5j_ftgil2.atm_g3_gktfv.atm_1ny5zik_13pnins.atm_nluod_1u09hbr.atm_1rdjdmm_1lf1kik.atm_7l_1a11ub3.atm_1vv33dc_v2fha3.atm_1gqaixb_oumlfv.atm_1pl68g0_1v7wvc0.atm_1765c25_1q4968j.atm_wzxrn8_1ez0meh.atm_1bnvlz8_1debaa8.atm_1aeo1g1_exct8b.atm_er9344_19bvopo.oqcw3sj";
    const comments_class = ".atm_l8_1077ktj.c34rbji";
    const result = {};
    // Author
    result["Author"] = await GetTextContent(page, author_class);
    // Title
    result["Title"] = await GetTextContent(page, title_class);
    // Time
    result["Time"] = await GetDatetime(page, time_class);
    const contents_array = await GetTextContents(page, contents_class);
    result["Contents"] = contents_array.join(" ").replace(/\n/g, " ");
    // Comments
    /*
    page.waitForSelector(old_to_new_class);
    old_to_new_element = page.$(old_to_new_class);
    await page.evaluate(ele => ele.click(), old_to_new_element);*/
    return result;
}

async function GetTextContent(page, scope, class_selector) {
    await page.waitForSelector(class_selector);
    const element = await scope.$(class_selector);
    const result = await page.evaluate(el => el.textContent, element);
    return result;
}

async function GetDatetime(page, class_selector) {
    await page.waitForSelector(class_selector);
    const element = await page.$(class_selector);
    const datetime = await page.evaluate(el => el.getAttribute("datetime"), element);
    const result = await FormatDatetime(datetime);
    return result;
}

async function GetTextContents(page, class_selector) {
    await page.waitForSelector(class_selector);
    const elements = await page.$$(class_selector);
    const result = await page.evaluate((...eles) => {
        return eles.map(ele => ele.textContent);
    }, ...elements);
    return result;
}

async function FormatDatetime(datetime) {
    const date = new Date(datetime);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

async function Scroll(page, scroll_time) {
    let viewportHeight = page.viewport().height;
    for(let i = 0; i < scroll_time; i++) {
        await page.evaluate((_viewportHeight) => {
            window.scrollBy(0, _viewportHeight);
        }, viewportHeight);
        await page.waitForTimeout(2000);
    }
}