var allImages = [];
var extractedImages = [];
var maxNrOfElements = 20000;
var allowedTags = [
    'address', 'article', 'aside', 'footer', 'header', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'hgroup', 'nav', 'section', 'dd', 'div', 'dl', 'dt', 'figcaption', 'figure', 'hr', 'li',
    'main', 'ol', 'p', 'pre', 'ul', 'a', 'abbr', 'b', 'bdi', 'bdo', 'br', 'cite', 'code', 'data',
    'dfn', 'em', 'i', 'img', 'kbd', 'mark', 'q', 'rp', 'rt', 'rtc', 'ruby', 's', 'samp', 'small', 'span',
    'strong', 'sub', 'sup', 'time', 'tt', 'u', 'var', 'wbr', 'del', 'ins', 'caption', 'col', 'colgroup',
    'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'tr',
    'math', 'maction', 'menclose', 'merror', 'mfenced', 'mfrac', 'mglyph', 'mi', 'mlabeledtr', 'mmultiscripts', 'mn', 'mo', 'mover', 'mpadded', 'mphantom', 'mroot',
    'mrow', 'ms', 'mspace', 'msqrt', 'mstyle', 'msub', 'msup', 'msubsup', 'mtable', 'mtd', 'mtext', 'mtr', 'munder', 'munderover', 'msgroup', 'mlongdiv', 'mscarries',
    'mscarry', 'mstack', 'semantics'
];
var mathMLTags = [
    'math', 'maction', 'menclose', 'merror', 'mfenced', 'mfrac', 'mglyph', 'mi', 'mlabeledtr', 'mmultiscripts', 'mn', 'mo', 'mover', 'mpadded', 'mphantom', 'mroot',
    'mrow', 'ms', 'mspace', 'msqrt', 'mstyle', 'msub', 'msup', 'msubsup', 'mtable', 'mtd', 'mtext', 'mtr', 'munder', 'munderover', 'msgroup', 'mlongdiv', 'mscarries',
    'mscarry', 'mstack', 'semantics'
]
var cssClassesToTmpIds = {};
var tmpIdsToNewCss = {};
// src: https://idpf.github.io/a11y-guidelines/content/style/reference.html
var supportedCss = [
    'background-color',
    'border', 'border-top', 'border-right', 'border-bottom', 'border-left',
    'color', 'font', 'font-size', 'font-weight', 'font-family',
    'letter-spacing', 'line-height',
    'list-style', 'outline',
    'padding', 'quotes',
    'text-decoration', 'text-transform', 'word-spacing',
];
//////

function getImageSrc(srcTxt) {
    if (!srcTxt) {
        return '';
    }
    srcTxt = srcTxt.trim();
    if (srcTxt === '') {
        return '';
    }

    var fileExtension = getFileExtension(srcTxt);
    if (fileExtension === '') {
        return '';
    }
    var newImgFileName = 'img' + getItemId(true) + '.' + fileExtension;

    var isB64Img = isBase64Img(srcTxt);
    if (isB64Img) {
        extractedImages.push({
            filename: newImgFileName, // TODO name
            data: getBase64ImgData(srcTxt)
        });
    } else {
        allImages.push({
            originalUrl: getImgDownloadUrl(srcTxt),
            filename: newImgFileName,  // TODO name
        });
    }

    return '../images/' + newImgFileName;
}

function formatPreCodeElements($jQueryElement) {
    $jQueryElement.find('pre').each(function (i, pre) {
        $(pre).replaceWith('<pre>' + pre.innerText + '</pre>');
    });
    $jQueryElement.find('code').each(function (i, pre) {
        $(pre).replaceWith('<code>' + pre.innerText + '</code>');
    });
}

function extractMathMl($htmlObject) {
    $htmlObject.find('span[id^="MathJax-Element-"]').each(function (i, el) {
        $(el).replaceWith('<span>' + el.getAttribute('data-mathml') + '</span>');
    });
}

function extractCanvasToImg($htmlObject) {
    $htmlObject.find('canvas').each(function (index, elem) {
        var tmpXP = getXPath(elem);
        tmpXP = tmpXP.replace(/^\/div\[1\]/m, '/html[1]/body[1]');
        var docEl = lookupElementByXPath(tmpXP);
        var jpegUrl = docEl.toDataURL('image/png');
        $(elem).replaceWith('<img src="' + jpegUrl + '" alt=""></img>');
    });
}

function extractSvgToImg($htmlObject) {
    var serializer = new XMLSerializer();
    $htmlObject.find('svg').each(function (index, elem) {
        try {
            var svgXml = serializer.serializeToString(elem);
            var imgSrc = 'data:image/svg+xml;base64,' + window.btoa(svgXml);
            $(elem).replaceWith('<img src="' + imgSrc + '">' + '</img>');
        } catch (e) {
            console.log(e)
        } finally {}
    });
}

function preProcess($htmlObject) {
    extractMathMl($htmlObject);
    extractCanvasToImg($htmlObject);
    extractSvgToImg($htmlObject);
    $htmlObject.find('script, style, noscript, iframe').remove();
    $htmlObject.find('*:empty').not('td').not('img').not('br').not('hr').remove();
        //MM: added <td> important for tables...
    // MM:  <pre> and <code> might be have fancy formatting (code snippets...)
    // formatPreCodeElements($htmlObject);
}

function force($content, withError) {
    try {
        var tagOpen = '@@@' + generateRandomTag();
        var tagClose = '###' + generateRandomTag();
        var startEl = '<object>';
        var endEl = '</object>';

        if (withError) {
            $content = $($content);
            preProcess($content);
        }

        $content.find('img').each(function (index, elem) {
            var $elem = $(elem);
            var imgSrc = getImageSrc($elem.attr('src'));
            if (imgSrc === '') {
                $elem.replaceWith('');
            } else {
                var className = $elem.attr('data-class');
                $elem.replaceWith(startEl + tagOpen + 'img src="' + imgSrc + '" class="' + className + '"' + tagClose + tagOpen + '/img' + tagClose + endEl);
            }
        });

        $content.find('a').each(function (index, elem) {
            var $elem = $(elem);
            // Keep internal link as is (for footnotes)
            var aHref = $elem.attr('href');
            if (aHref && aHref.indexOf('#') === 0) {
                aHref = escapeXMLChars(aHref); // keep as is
            }
            else {
                aHref = getHref(aHref);
            }
            if (aHref === '') {
                $elem.replaceWith('');
            } else {
                var className = $elem.attr('data-class');
                $elem.replaceWith(startEl + tagOpen + 'a href="' + aHref + '" class="' + className + '"' + tagClose + $(elem).html() + tagOpen + '/a' + tagClose + endEl);
            }
        });

        all($content);

        function all($startElement) {
            var tagName = $startElement.get(0).tagName.toLowerCase();
            if (allowedTags.indexOf(tagName) >= 0) {
                var children = $startElement.children();
                var childrenLen = children.length;
                while (childrenLen--) {
                    all($(children[childrenLen]));
                }
                var className = $startElement.attr('data-class');
                $startElement.replaceWith(startEl + tagOpen + tagName + ' class="' + className + '"' + tagClose + $startElement.html() + tagOpen + '/' + tagName + tagClose + endEl);
            }
        }

        var contentString = $content.text();

        var tagOpenRegex = new RegExp(tagOpen, 'gi');
        var tagCloseRegex = new RegExp(tagClose, 'gi');
        contentString = contentString.replace(tagOpenRegex, '<');
        contentString = contentString.replace(tagCloseRegex, '>');
        contentString = contentString.replace(/&nbsp;/gi, '&#160;');

        // getHref() replace does not work (&amp; is overwritten)
        contentString = escapeXMLChars(contentString);

        return contentString;
    } catch (e) {
        console.log('Error:', e);
        return '';
    }
}

// Attributes to keep for tags others than: img, a, br, hr
var extraAttrs = [ 'title', 'lang', 'span', 'name', 'id', 'colspan', 'rowspan', 'align', 'valign', 'clear' ];

function sanitize(rawContentString) {
    extractedImages = [];
    var srcTxt = '';
    var dirty = null;
    try {
        var wdirty = $.parseHTML(rawContentString);
        $wdirty = $(wdirty);

        preProcess($wdirty);

        if ($('*').length > maxNrOfElements) {
            return force($wdirty, false);
        }

        dirty = '<div>' + $wdirty.html() + '</div>';

        var results = '';
        var lastFragment = '';
        var lastTag = '';

        HTMLParser(dirty, {
            start: function(tag, attrs, unary) {
                lastTag = tag;
                if (allowedTags.indexOf(tag) < 0) {
                    return;
                }

                if (tag === 'img') {
                    var tmpAttrsTxt = '';
                    let tmpSrc = ''
                    for (var i = 0; i < attrs.length; i++) {
                        if (attrs[i].name === 'src') {
                            tmpSrc = getImageSrc(attrs[i].value)
                            tmpAttrsTxt += ' src="' + tmpSrc + '"';
                        } else if (attrs[i].name === 'data-class') {
                            tmpAttrsTxt += ' class="' + attrs[i].value + '"';
                        } else if (attrs[i].name === 'align') {
                            tmpAttrsTxt += ' align="' + attrs[i].value + '"';
                        }
                    }
                    if (tmpSrc === '') {
                        // ignore imgs without source
                        lastFragment = ''
                    } else {
                        lastFragment = tmpAttrsTxt.length === 0 ? '<img></img>' : '<img' + tmpAttrsTxt + ' alt=""></img>';
                    }
                } else if (tag === 'a') {
                    var tmpAttrsTxt = '';
                    for (var i = 0; i < attrs.length; i++) {
                        if (attrs[i].name === 'href') {
                            var aHref = attrs[i].value;
                            if (aHref && aHref.indexOf('#') === 0) {
                                // keep as is
                            }
                            else {
                                aHref = getHref(aHref);
                            }
                            tmpAttrsTxt += ' href="' + aHref + '"';
                        } else if (attrs[i].name === 'data-class') {
                            tmpAttrsTxt += ' class="' + attrs[i].value + '"';
                        // some more extras for footnotes links
                        } else if (attrs[i].name === 'name') {
                            tmpAttrsTxt += ' name="' + attrs[i].value + '"';
                        } else if (attrs[i].name === 'id') {
                            tmpAttrsTxt += ' id="' + attrs[i].value + '"';
                        }
                    }
                    lastFragment = '<' + tag + tmpAttrsTxt + '>';
                } else if (tag === 'br' || tag === 'hr') {
                    var tmpAttrsTxt = '';
                    for (var i = 0; i < attrs.length; i++) {
                        if (attrs[i].name === 'data-class') {
                            tmpAttrsTxt += ' class="' + attrs[i].value + '"';
                        } else if (attrs[i].name === 'clear') {
                            tmpAttrsTxt += ' clear="' + attrs[i].value + '"';
                        }
                    }
                    lastFragment = '<' + tag + tmpAttrsTxt + '></' + tag + '>';
                } else if (tag === 'math') {
                    var tmpAttrsTxt = '';
                    tmpAttrsTxt += ' xmlns="http://www.w3.org/1998/Math/MathML"';
                    for (var i = 0; i < attrs.length; i++) {
                        if (attrs[i].name === 'alttext') {
                            tmpAttrsTxt += ' alttext="' + attrs[i].value + '"';
                        }
                    }
                    lastFragment = '<' + tag + tmpAttrsTxt + '>';
                } else {
                    var tmpAttrsTxt = '';
                    for (var i = 0; i < attrs.length; i++) {
                        if (attrs[i].name === 'data-class') {
                            tmpAttrsTxt += ' class="' + attrs[i].value + '"';
                        }
                    }
                    for (var i = 0; i < attrs.length; i++) {
                        if (extraAttrs.indexOf( attrs[i].name ) != -1 ) {
                          tmpAttrsTxt += ' '+attrs[i].name+'="' + attrs[i].value + '"'  ;
                        }
                    }
                    lastFragment = '<' + tag + tmpAttrsTxt + '>';
                }

                results += lastFragment;
                lastFragment = '';
            },
            end: function(tag) {
                if (allowedTags.indexOf(tag) < 0 || tag === 'img' || tag === 'br' || tag === 'hr') {
                    return;
                }

                results += "</" + tag + ">"; // Removed trailing '\n' to not mess with formatting )
            },
            chars: function(text) {
                if (lastTag !== '' && allowedTags.indexOf(lastTag) < 0) {
                    return;
                }
                results += text;
            },
            comment: function(text) {
                // results += "<!--" + text + "-->";
            }
        });

        results = results.replace(/&nbsp;/gi, '&#160;');

        return results;

    } catch (e) {
        console.log('Error:', e);
        return force(dirty, true);
    }

}

function getContent(htmlContent) {
    try {
        var tmp = document.createElement('div');
        tmp.appendChild(htmlContent.cloneNode(true));
        var dirty = '<div>' + tmp.innerHTML + '</div>';
        return sanitize(dirty);
    } catch (e) {
        console.log('Error:', e);
        return '';
    }
}

/////

function getPageUrl(url) {
    return url.toLowerCase().replace(/\s+/g,'_').replace(/[^a-z0-9_]/g,'') + getItemId() + '.xhtml';
}

function getPageTitle(title) {
    if (title.trim().length === 0) {
        return 'ebook';
    }
    return title;
}

function getSelectedNodes() {
    // if (document.selection) {
        // return document.selection.createRange().parentElement();
        // return document.selection.createRange();
    // }
    var selection = window.getSelection();
    var docfrag = [];
    for (var i = 0; i < selection.rangeCount; i++) {
        docfrag.push(selection.getRangeAt(i).cloneContents());
    }
    return docfrag;
}

/////

function jsonToCss(jsonObj) {
    var keys = Object.keys(jsonObj);
    var result = '';
    for (var i = 0; i < keys.length; i++) {
        var tmpJsonObj = jsonObj[keys[i]];
        var tmpKeys = Object.keys(tmpJsonObj);
        // if (tmpKeys.length == 0) continue; // not needed, we're never called when empty styles
        result += '.' + keys[i] + ' { ';
        for (var j = 0; j < tmpKeys.length; j++) {
            result += tmpKeys[j] + ': ' + tmpJsonObj[tmpKeys[j]] + '; ';
        }
        result += '}\n';
    }
    return result;
}

function extractCss(includeStyle, appliedStyles) {
    if (includeStyle) {
        $('body').find('*').each((i, pre) => {
            let $pre = $(pre);

            if (allowedTags.indexOf(pre.tagName.toLowerCase()) < 0) return;
            if (mathMLTags.indexOf(pre.tagName.toLowerCase()) > -1) return;

            if (!$pre.is(':visible')) {
                $pre.replaceWith('');
            } else {
                if (pre.tagName.toLowerCase() === 'svg') return;

                let classNames = pre.getAttribute('class');
                if (!classNames) {
                    classNames = pre.getAttribute('id');
                    if (!classNames) {
                        classNames = pre.tagName + '-' + Math.floor(Math.random()*100000);
                    }
                }
                let tmpName = cssClassesToTmpIds[classNames];
                let tmpNewCss = tmpIdsToNewCss[tmpName];
                if (!tmpName) {
                    tmpName = 'class-' + Math.floor(Math.random()*100000);
                    cssClassesToTmpIds[classNames] = tmpName;
                }
                if (!tmpNewCss) {
                    // var style = window.getComputedStyle(pre);
                    tmpNewCss = {};
                    for (let cssTagName of supportedCss) {
                        let cssValue = $pre.css(cssTagName);
                        if (cssValue && cssValue.length > 0) {
                            tmpNewCss[cssTagName] = cssValue;
                        }
                    }
                    tmpIdsToNewCss[tmpName] = tmpNewCss;
                }
                pre.setAttribute('data-class', tmpName);
            }
        });
        return jsonToCss(tmpIdsToNewCss);
    } else {
        let mergedCss = '';
        if (appliedStyles && appliedStyles.length > 0) {
            for (let i = 0; i < appliedStyles.length; i++) {
                mergedCss += appliedStyles[i].style;
            }
            return mergedCss;
        }
    }
    return null
}

/////

function deferredAddZip(url, filename) {
    var deferred = $.Deferred();
    JSZipUtils.getBinaryContent(url, function(err, data) {
        if (err) {
            // deferred.reject(err); TODO
            console.log('Error:', err);
            deferred.resolve();
        } else {
            extractedImages.push({
                filename: filename,
                data: base64ArrayBuffer(data)
            });
            deferred.resolve();
        }
    });
    return deferred;
}

var chapterId = null;
var itemId = null;
function getItemId(may_have_many) {
    if (may_have_many) {
        if (!itemId)
            itemId = 0;
        itemId++;
        if (chapterId)
            return chapterId + "-" + itemId;
        else
            return itemId.toString();
    }
    else if (chapterId)
        return chapterId.toString();
    else
        return "";
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    let imgsPromises = [];
    let result = {};
    let pageSrc = '';
    let tmpContent = '';
    let styleFile = null;

    allImages = [];
    chapterId = request.chapterId; // only provided when "add as chapter"
    itemId = null;

    if (request.type === 'extract-page') {
        styleFile = extractCss(request.includeStyle, request.appliedStyles)
        pageSrc = document.getElementsByTagName('body')[0];
        tmpContent = getContent(pageSrc);
    } else if (request.type === 'extract-selection') {
        styleFile = extractCss(request.includeStyle, request.appliedStyles)
        pageSrc = getSelectedNodes();
        pageSrc.forEach((page) => {
            tmpContent += getContent(page);
        });
    }

    allImages.forEach((tmpImg) => {
        imgsPromises.push(deferredAddZip(tmpImg.originalUrl, tmpImg.filename));
    });

    $.when.apply($, imgsPromises).done(() => {
        let tmpTitle = getPageTitle(document.title);
        result = {
            url: getPageUrl(tmpTitle),
            title: tmpTitle,
            baseUrl: getCurrentUrl(),
            styleFileContent: styleFile,
            styleFileName: 'style' + getItemId() + '.css',
            images: extractedImages,
            content: tmpContent
        };
        sendResponse(result);
    }).fail((e) => {
        console.log('Error:', e);
        sendResponse(null)
    });

    return true;
});
