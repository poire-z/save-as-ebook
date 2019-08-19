
///////////////////
///////////////////
///////////////////
///////////////////
/// Only for testing

chrome.runtime.onInstalled.addListener(details => {
  if (navigator.userAgent === 'PuppeteerTestingAgent') {
      let TEST_TIMER = null
      chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
          if (TEST_TIMER) {
              clearTimeout(TEST_TIMER)
          }

          TEST_TIMER = setTimeout(()=> {
                executeCommand({type: 'save-page'})
          }, 2000)
      });
  }
});



///////////////////
///////////////////
///////////////////
///////////////////



var isBusy = false;

var defaultStyles = [
    {
        title: 'Reddit Comments',
        url: 'reddit\\.com\\/r\\/[^\\/]+\\/comments',
        style: `.side {
display: none;
}
#header {
display: none;
}
.arrow, .expand, .score, .live-timestamp, .flat-list, .buttons, .morecomments, .footer-parent, .icon {
display: none !important;
}
`
    },{
        title: 'Wikipedia Article',
        url: 'wikipedia\\.org\\/wiki\\/',
        style: `#mw-navigation {
display: none;
}
#footer {
display: none;
}
#mw-panel {
display: none;
}
#mw-head {
display: none;
}
`
    },{
        title: 'YCombinator News Comments',
        url: 'news\\.ycombinator\\.com\\/item\\?id=[0-9]+',
        style: `#hnmain > tbody > tr:nth-child(1) > td > table {
display: none;
}
* {
background-color: white;
}
.title, .storylink {
text-align: left;
font-weight: bold;
font-size: 20px;
}
.score {
display: none;
}
.age {
display: none;
}
.hnpast {
display: none;
}
.togg {
display: none;
}
.votelinks, .rank {
display: none;
}
.votearrow {
display: none;
}
.yclinks {
display: none;
}
form {
display: none;
}
a.hnuser {
font-weight: bold;
color: black !important;
padding: 3px;
}
.subtext > span, .subtext > a:not(:nth-child(2)) {
display: none;
}
`
    },{
        title: 'Medium Article',
        url: 'medium\\.com',
        style: `.metabar {
display: none !important;
}
header.container {
display: none;
}
.js-postShareWidget {
display: none;
}
footer, canvas {
display: none !important;
}
.u-fixed, .u-bottom0 {
display: none;
}
`
    },{
        title: 'Twitter',
        url: 'twitter\\.com\\/.+',
        style: `.topbar {
display: none !important;
}
.ProfileCanopy, .ProfileCanopy-inner {
display: none;
}
.ProfileSidebar {
display: none;
}
.ProfileHeading {
display: none !important;
}
.ProfileTweet-actionList {
display: none;
}
`
    }

];


var last_chapter_id = null;
chrome.storage.local.get('last_chapter_id', function (data) {
    if (!data || !data.last_chapter_id) {
        last_chapter_id = 0;
    }
    else {
        last_chapter_id = data.last_chapter_id;
    }
})
function getChapterId() {
    last_chapter_id++;
    chrome.storage.local.set({'last_chapter_id': last_chapter_id});
    return last_chapter_id;
}

chrome.commands.onCommand.addListener((command) => {
    executeCommand({type: command})
});

function executeCommand(command) {
    if (isBusy) {
        chrome.tabs.query({
            currentWindow: true,
            active: true
        }, (tab) => {
            chrome.tabs.sendMessage(tab[0].id, {'alert': 'Work in progress! Please wait until the current eBook is generated!'}, (r) => {
              console.log(r);
            });
        })
        return;
    }
    if (command.type === 'save-page') {
        dispatch('extract-page', false, []);
        isBusy = true;
    } else if (command.type === 'save-selection') {
        dispatch('extract-selection', false, []);
        isBusy = true;
    } else if (command.type === 'add-page') {
        dispatch('extract-page', true, []);
        isBusy = true;
    } else if (command.type === 'add-selection') {
        dispatch('extract-selection', true, []);
        isBusy = true;
    }
}

function dispatch(action, justAddToBuffer, appliedStyles) {
    if (!justAddToBuffer) {
        // Don't remove added chapters if we are saving some individual article in between
        // _execRequest({type: 'remove'});
    }
    chrome.browserAction.setBadgeBackgroundColor({color:"red"});
    chrome.browserAction.setBadgeText({text: "Busy"});

    chrome.tabs.query({
        currentWindow: true,
        active: true
    }, (tab) => {

        isIncludeStyles((result) =>{
            let isIncludeStyle = result.includeStyle
            prepareStyles(tab, isIncludeStyle, appliedStyles, (tmpAppliedStyles) => {
                applyAction(tab, action, justAddToBuffer, isIncludeStyle, tmpAppliedStyles, () => {
                    alert('done')
                })
            })
        })
    });
}

function isIncludeStyles(callback) {
    chrome.storage.local.get('includeStyle', (data) => {
        if (!data) {
            callback({includeStyle: false});
        } else {
            callback({includeStyle: data.includeStyle});
        }
    });
}

function prepareStyles(tab, includeStyle, appliedStyles, callback) {
    if (!includeStyle) {
        callback(appliedStyles)
        return
    }

    chrome.storage.local.get('styles', (data) => {
        let styles = defaultStyles;
        if (data && data.styles) {
            styles = data.styles;
        }
        let currentUrl = tab[0].url;
        let currentStyle = null;

        if (styles && styles.length > 0) {
            let allMatchingStyles = [];

            for (let i = 0; i < styles.length; i++) {
                currentUrl = currentUrl.replace(/(http[s]?:\/\/|www\.)/i, '').toLowerCase();
                let styleUrl = styles[i].url;
                let styleUrlRegex = null;

                try {
                    styleUrlRegex =  new RegExp(styleUrl, 'i');
                } catch (e) {
                }

                if (styleUrlRegex && styleUrlRegex.test(currentUrl)) {
                    allMatchingStyles.push({
                        index: i,
                        length: styleUrl.length
                    });
                }
            }

            if (allMatchingStyles.length >= 1) {
                allMatchingStyles.sort((a, b) => b.length - a.length);
                let selStyle = allMatchingStyles[0];
                currentStyle = styles[selStyle.index];

                if (currentStyle && currentStyle.style) {
                    chrome.tabs.insertCSS(tab[0].id, {code: currentStyle.style});
                    appliedStyles.push(currentStyle);
                }
            }
        }

        callback(appliedStyles)
    });
}

function applyAction(tab, action, justAddToBuffer, includeStyle, appliedStyles, callback) {
    chrome.tabs.sendMessage(tab[0].id, {
        chapterId: justAddToBuffer ? getChapterId() : null,
        type: action,
        includeStyle: includeStyle,
        appliedStyles: appliedStyles
    }, (response) => {

        if (!response) {
            resetBusy()
            chrome.tabs.sendMessage(tab[0].id, {'alert': 'Save as eBook does not work on this web site!'}, (r) => {
              console.log(r);
            });
            return;
        }

        if (response.content.trim() === '') {
            if (justAddToBuffer) {
                chrome.tabs.sendMessage(tab[0].id, {'alert': 'Cannot add an empty selection as chapter!'}, (r) => {
                  console.log(r);
                });
            } else {
                chrome.tabs.sendMessage(tab[0].id, {'alert': 'Cannot generate the eBook from an empty selection!'}, (r) => {
                  console.log(r);
                });
            }
            resetBusy()
            return;
        }
        if (!justAddToBuffer) {
            chrome.tabs.sendMessage(tab[0].id, {'shortcut': 'build-ebook', response: [response]}, (r) => {});
        } else {
            chrome.storage.local.get('allPages', (data) => {
                if (!data || !data.allPages) {
                    data.allPages = [];
                }
                data.allPages.push(response);
                chrome.storage.local.set({'allPages': data.allPages});
                chapterCount = data.allPages.length;
                resetBusy()
                chrome.tabs.sendMessage(tab[0].id, {'alert': 'Page or selection added as chapter!'}, (r) => {});
            })
        }
    });
}

// From https://github.com/alexadam/save-as-ebook/pull/19
// browserAction badge to show number of added chapters
var chapterCount = 0;
function updateBadge() {
    chrome.browserAction.setBadgeBackgroundColor({color: [15,127,95,255]});
    if(chapterCount === 0) {
        chrome.browserAction.setBadgeText({text: ""});
    }
    else {
        chrome.browserAction.setBadgeText({text: chapterCount.toString()});
    }
}
chrome.storage.local.get('allPages', function (data) {
    if (!data || !data.allPages) {
        chapterCount = 0;
    }
    else {
        chapterCount = data.allPages.length;
    }
    updateBadge();
});
// end

function resetBusy() {
    isBusy = false;
    chrome.browserAction.setBadgeText({text: ""});
    updateBadge();

    let popups = chrome.extension.getViews({type: "popup"});
    if (popups && popups.length > 0) {
        popups[0].close()
    }
}

chrome.runtime.onMessage.addListener(_execRequest);

function _execRequest(request, sender, sendResponse) {
    if (request.type === 'get') {
        chrome.storage.local.get('allPages', function (data) {
            if (!data || !data.allPages) {
                sendResponse({allPages: []});
            }
            sendResponse({allPages: data.allPages});
        })
    }
    if (request.type === 'set') {
        chrome.storage.local.set({'allPages': request.pages});
        chapterCount = request.pages.length;
        updateBadge();
    }
    if (request.type === 'remove') {
        chrome.storage.local.remove('allPages');
        chrome.storage.local.remove('title');
        chapterCount = 0;
        updateBadge();
    }
    if (request.type === 'get title') {
        chrome.storage.local.get('title', function (data) {
            if (!data || !data.title || data.title.trim().length === 0) {
                sendResponse({title: 'eBook'});
            } else {
                sendResponse({title: data.title});
            }
        })
    }
    if (request.type === 'set title') {
        chrome.storage.local.set({'title': request.title});
    }
    if (request.type === 'get styles') {
        chrome.storage.local.get('styles', function (data) {
            if (!data || !data.styles) {
                sendResponse({styles: defaultStyles});
            } else {
                sendResponse({styles: data.styles});
            }
        });
    }
    if (request.type === 'set styles') {
        chrome.storage.local.set({'styles': request.styles});
    }
    if (request.type === 'get current style') {
        chrome.storage.local.get('currentStyle', function (data) {
            if (!data || !data.currentStyle) {
                sendResponse({currentStyle: 0});
            } else {
                sendResponse({currentStyle: data.currentStyle});
            }
        });
    }
    if (request.type === 'set current style') {
        chrome.storage.local.set({'currentStyle': request.currentStyle});
    }
    if (request.type === 'get include style') {
        chrome.storage.local.get('includeStyle', function (data) {
            if (!data) {
                sendResponse({includeStyle: false});
            } else {
                sendResponse({includeStyle: data.includeStyle});
            }
        });
    }
    if (request.type === 'set include style') {
        chrome.storage.local.set({'includeStyle': request.includeStyle});
    }
    if (request.type === 'is busy?') {
        sendResponse({isBusy: isBusy})
    }
    if (request.type === 'set is busy') {
        isBusy = request.isBusy
    }
    if (request.type === 'save-page' || request.type === 'save-selection' ||
        request.type === 'add-page' || request.type === 'add-selection') {
        executeCommand({type: request.type})
    }
    if (request.type === 'done') {
        resetBusy()
    }
    return true;
}
