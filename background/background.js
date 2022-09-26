import md5 from '../deps/md5.js';
var articlemd = '';
/**
 * 用于接收关闭配置页的方法，可以关闭当前tab页
 * 还用于接收其他消息，新增接收内容页复制得到的markdown字符串
 */
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  console.log('Request comes from content script ' + sender.tab.id);
  if (request.greeting === 'close_tab') {
    chrome.tabs.remove(sender.tab.id);
  } else if (request.greeting === 'receivemsg') {
    articlemd = request.msg;
  } else if(request.greeting === 'getboolmarkdown') { // 获取markdown配置
    chrome.storage.local.get(['markdown'], function (result) {
      sendResponse(result.markdown);
      });
      return true;
  }
});

chrome.runtime.onInstalled.addListener(function () {
  // 浏览器页面右键菜单逻辑
  const menu = {
    menus: [
      // {
      //   id: 'emloger',
      //   visible: true,
      //   title: 'emlog发布插件',
      //   contexts: ['page'], // page表示页面右键就会有这个菜单，如果想要当选中文字时才会出现此右键菜单，用：selection
      // },
      // {
      //   id: 'postnote',
      //   visible: true,
      //   parentId: 'emloger',
      //   title: '发布笔记',
      //   contexts: ['page'],
      // },
      {
        id: 'postnoteselect',
        visible: true,
        title: '选中文字发布笔记',
        contexts: ['selection'],
      },
      {
        id: 'postarticleselect',
        visible: true,
        title: '选中文字发布文章',
        contexts: ['selection'],
      },
    ],
  };

  const createMenu = () => {
    menu.menus.forEach((value) => {
      chrome.contextMenus.create(value);
    });
  };
  createMenu();
});


chrome.contextMenus.onClicked.addListener(function callback(param) {
  console.log(param);
  switch (param.menuItemId) {
    case 'postarticleselect': // 选中文字右键直接发布文章
      console.log('选中文字直接发布文章');
      if(articlemd !== '') {// 如果有选中文字转换的markdown字符串就使用转换后的。
        param.selectionText = articlemd;
      }
      selectTextPost(param,'/?rest-api=article_post');
      break;
    case 'postnoteselect': // 选中文字右键直接发布笔记
      console.log('选中文字直接发布笔记');
      selectTextPost(param,'/?rest-api=note_post');
      break;
    case 'emloger': // 右键打开
    openEditor();
      break;
    default:
      break;
  }
});
function openEditor() {
  // todo 打开编辑框，用于发布
  // 发布成功弹窗
  postSucces();
}
/**
 * 选中文字发布 笔记或者文章。 文章标题 取浏览器标题
 * @param {*} param 右键获取参数 selection是选中文字
 * @param {string} urlpath 发布接口路径
 */
function selectTextPost(param,urlpath) {
  var apikey = '';
  var apiurl = '';
  chrome.storage.local.get(['postblogtoken', 'posturl'], function (result) {
    if (result.postblogtoken && result.posturl) {
      apikey = result.postblogtoken;
      apiurl = result.posturl;
      let req_time = new Date().getTime();
      // 计算 accesstoken
      let req_sign = md5(req_time + '' + apikey);
      chrome.tabs.query({ currentWindow: true, active: true }, function (tabs) {
      console.log(tabs[0]); // 取得浏览器标题作为文章标题
      fetch(apiurl + urlpath, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'req_time=' + req_time + '&req_sign=' + req_sign + '&t=' + param.selectionText +
        '&title=' + encodeURIComponent(tabs[0].title.split('-')[0]) + '&content=' + encodeURIComponent(param.selectionText) + '&excerpt=' + encodeURIComponent(param.selectionText.substr(0,40)),
      }).then(function (result) {
        // 发布成功的弹窗
          postSucces();
      });});
    } else {
      // 如果参数未获取到-重新填写apikey及url
      // 打开设置页
      chrome.runtime.openOptionsPage(function () {
        console.log();
      })
    }
  });
}
/**
 * 发布成功的弹窗
 */
function postSucces() {
  chrome.tabs.query({ currentWindow: true, active: true }, function (tabs) {
  chrome.scripting.insertCSS({
    target: { tabId: tabs[0].id },
    files: ['./deps/layer/theme/default/layer.css'],
  });
  chrome.scripting.executeScript({
    target: { tabId: tabs[0].id },
    files: ['./deps/jquery.min.js', './deps/layer/layer.js', '/background/backExeScript.js'],
  });
})
}
