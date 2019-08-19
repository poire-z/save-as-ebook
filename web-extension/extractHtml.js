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

function sanitize(rawContentString, divClassName) {
    extractedImages = [];
    var srcTxt = '';
    var dirty = null;
    try {
        var wdirty = $.parseHTML(rawContentString);
        $wdirty = $(wdirty);

        preProcess($wdirty);

        var nbelems = $('*').length;
        console.log("sanitize nb elems:", nbelems);
        if (nbelems > maxNrOfElements) {
            console.log("sanitize: using alternate parser (force())");
            return force($wdirty, false);
        }

        if (divClassName)
            divClassName = ' data-class="'+divClassName+'"';
        else
            divClassName = '';
        dirty = '<div' + divClassName + '>' + $wdirty.html() + '</div>';

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

function getContent(htmlContent, divClassName) {
    try {
        var tmp = document.createElement('div');
        tmp.appendChild(htmlContent.cloneNode(true));
        var dirty = '<div>' + tmp.innerHTML + '</div>';
        return sanitize(dirty, divClassName);
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

function getSelectedNodes() { // no more used
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

// src: https://idpf.github.io/a11y-guidelines/content/style/reference.html
var unsupportedCss = [
    // more bothering than useful:
    'letter-spacing', 'word-spacing',
    'orphans', 'widows', 'text-align-last', 'hyphens',
    'page-break-before', 'page-break-after', 'page-break-inside',
    'outline', 'quotes', 'list-style-image',
    'background', 'background-image', 'background-repeat', 'background-attachment', 'background-position',

];
var supportedCss = [
    // Parsed
    'font-size',
    'font-style',
    'font-weight',
    'font-family',
    'line-height', // bothering
    'text-indent',
    'text-align',
    'text-decoration', 'text-transform',
    'vertical-align',
    'color', // bothering on eInk
    'background-color', // bothering on eInk
    'display',
    'white-space',
    'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
    'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
    'list-style-type', 'list-style-position',
    'float', 'clear',
    'width', 'height', // for floats
    'border-collapse', 'border-spacing',
    // Managed specifically, will end up aggregated:
    'border-top-style', 'border-top-width', 'border-top-color',
    'border-bottom-style', 'border-bottom-width', 'border-bottom-color',
    'border-left-style', 'border-left-width', 'border-left-color',
    'border-right-style', 'border-right-width', 'border-right-color',
    // Outputed when aggregated
    'border-top', 'border-right', 'border-bottom', 'border-left'
]
var inheritedCss = [
    'font-size',
    'font-style',
    'font-weight',
    'font-family',
    'line-height',
    'text-indent',
    'text-align',
    'text-decoration', 'text-transform',
    'color',
    'white-space',
    'list-style-type', 'list-style-position'
]
var nonInheritedCss = [
    'vertical-align',
    'background-color',
    'display',
    'float', 'clear',
    'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
    'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
    'border-collapse', 'border-spacing',
]

function rgb2hex(rgb, fallback) {
    if (!rgb)
        return fallback;
    if ( rgb.search("rgb") == -1 ) {
        return rgb;
    }
    else if ( rgb == 'rgba(0, 0, 0, 0)' ) {
        return 'transparent';
    }
    var parsed = rgb.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/);
    if (!parsed)
        return fallback;
    return "#" + ("0" + parseInt(parsed[1]).toString(16)).slice(-2)
               + ("0" + parseInt(parsed[2]).toString(16)).slice(-2)
               + ("0" + parseInt(parsed[3]).toString(16)).slice(-2);
}

var ref_rem_px = 0;
function pxToEm(v, pv) {
    var flt = parseFloat(v);
    var pflt = parseFloat(pv);
    if ( ref_rem_px == 0 ) {
        if (isFinite(pflt))
            ref_rem_px = pflt;
        else if (isFinite(flt))
            ref_rem_px = flt;
    }
    if (!isFinite(flt))
        return "0";
    if (isFinite(pflt) && pflt != 0) {
        var em = flt / pflt;
        return Number(Math.round(em+'e3')+'e-3') + "em";
        // cleaner than: return em.toFixed(3) + "em";
    }
    if ( ref_rem_px > 0) {
        var rem = flt / ref_rem_px;
        return Number(Math.round(rem+'e3')+'e-3') + "rem";
    }
}

function getNodeStyle(pre, onlyInherited) {
    // We only get computed values (so, sizes in px) with css()
    // (Calling css() is the most expensive operation in the process.)
    var newcs = {};
    var ncs = $(pre).css(supportedCss);
    var pcs = {}
    var pfontsize = null;
    if (pre.parentNode && $(pre.parentNode).data("style_fetched") == true) {
        // Parent node has been included and had its style checked by us.
        // We can inherit from it
        pcs = $(pre.parentNode).css(inheritedCss); // only the inherited ones
        if ( pcs["font-size"] )
            pfontsize = pcs["font-size"];
    }
    $(pre).data("style_fetched", true);
    for (let prop of inheritedCss) {
        var v = ncs[prop];
        if ( v && v.startsWith("-moz-") ) // text-align: -moz-right (?)
            v = v.substring(5);
        var pv = pcs[prop];
        if ( pv && pv.startsWith("-moz-") )
            pv = pv.substring(5);
        if ( v && v != pv ) { // defined and different value from parent
            if ( prop == 'font-size' || prop == 'text-indent' ) { // sized properties
                v = pxToEm(v, pfontsize);
                if (v) // Don't ignore "0", as it resets inherited non-0 value
                    newcs[prop] = v;
            }
            if ( prop == 'line-height' ) { // sized properties
                // Should be scaled against current node font size, if we set it to 'em'
                var fontsize = ncs["font-size"];
                v = pxToEm(v, fontsize);
                if (v)
                    newcs[prop] = v;
            }
            else if ( prop == 'font-weight' ) { // special named properties
                if ( parseInt(v) > 500 )
                    newcs[prop] = "bold";
                else
                    newcs[prop] = "normal";
            }
            else if ( prop == 'font-family' ) {
                if ( v.includes("monospace") || v.includes("Mono") )
                    newcs[prop] = "monospace";
                else
                    newcs[prop] = "serif";
            }
            else if ( prop == 'color' ) {
                v = rgb2hex(v);
                newcs[prop] = v;
            }
            else { // others are named properties
                newcs[prop] = v; // use as-is
            }
        }
    }
    if (onlyInherited) {
        return newcs;
    }
    for (let prop of nonInheritedCss) {
        var v = ncs[prop];
        if ( v && v.startsWith("-moz-") ) // text-align: -moz-right (?)
            v = v.substring(5);
        else if ( v && v.startsWith("-webkit-") )
            v = v.substring(8);
        if ( v ) {
            if ( prop.startsWith('margin-') || prop.startsWith('padding-') ) { // sized properties
                if ( v != "0px" ) { // ignore 0
                    v = pxToEm(v, pfontsize);
                    if (v && v != "0") // ignore "0"
                        newcs[prop] = v;
                }
            }
            else if ( prop == 'border-spacing' ) { // double sized property
                if ( v != "0px 0px" ) { // ignore 0
                    newcs[prop] = v; // use computed value in px for now
                }
            }
            else if ( prop == 'vertical-align' ) { // sized or named properties
                var asnum = parseFloat(v);
                if (isFinite(asnum)) {
                    v = pxToEm(v, pfontsize);
                    if (v)
                        newcs[prop] = v;
                }
                else { // named property
                    if ( v != "baseline" ) // default value
                        newcs[prop] = v;
                }
            }
            else if ( prop == 'border-collapse' ) {
                if ( v != 'separate' ) { // default value
                    newcs[prop] = v;
                }
            }
            else if ( prop == 'float' ) {
                if ( v != 'none' ) {
                    newcs[prop] = v;
                    newcs["width"] = ncs["width"]; // keep computed width in px
                }
            }
            else if ( prop == 'clear' ) {
                if ( v != 'none' ) {
                    newcs[prop] = v;
                    newcs["width"] = ncs["width"]; // keep computed width in px
                }
            }
            else if ( prop == 'display' ) {
                if ( v != 'block' && v!= 'inline' ) { // otherwise assume display from tag name
                    newcs[prop] = v;
                }
            }
            else if ( prop == 'background-color' ) {
                v = rgb2hex(v);
                if ( v != 'transparent' )
                    newcs[prop] = v;
            }
            else { // others (if any) are named properties
                newcs[prop] = v; // use as-is
            }
        }
    }
    // Aggregated border properties: keep computed value in px
    var v;
    v = ncs['border-top-width'];
    if ( v && v != '0px' )
        newcs['border-top'] = v + " " + ncs['border-top-style'] + " " + rgb2hex(ncs['border-top-color'], 'black');
    v = ncs['border-bottom-width'];
    if ( v && v != '0px' )
        newcs['border-bottom'] = v + " " + ncs['border-bottom-style'] + " " + rgb2hex(ncs['border-bottom-color'], 'black');
    v = ncs['border-left-width'];
    if ( v && v != '0px' )
        newcs['border-left'] = v + " " + ncs['border-left-style'] + " " + rgb2hex(ncs['border-left-color'], 'black');
    v = ncs['border-top-width'];
    if ( v && v != '0px' )
        newcs['border-right'] = v + " " + ncs['border-right-style'] + " " + rgb2hex(ncs['border-right-color'], 'black');

    return newcs;
}

// MM: ugly approach - maybe using hash later...
function styleToString(styleArr) {
    var tmp = "";
    for (var key in styleArr) {
        tmp += key + ':' +styleArr[key] + ';';
    }
    //console.log ("MM: debug: styleToString(): "  + tmp);
    return tmp;
}

function extractCss(topNode, selection, includeStyle, appliedStyles) {
    // console.log(Date.now(), "extractCss() started\n");
    var cssClassesToTmpIds = {};
    var tmpIdsToNewCss = {};
    var styleLookup = {};
    if (includeStyle) {
        var bodycs = $('body').css(supportedCss);
        pxToEm( bodycs["font-size"] ); // just to set ref_rem_px

        var ranges = [];
        if (topNode) {
            ranges.push([topNode, null, "body"]);
        }
        else if (selection) {
            for (var i = 0; i < selection.rangeCount; i++) {
                ranges.push([ selection.getRangeAt(i).commonAncestorContainer, selection.getRangeAt(i), i+1 ]);
            }
        }
        ranges.forEach((sel) => {
            let topNode = sel[0];
            let range = sel[1];
            let selectionNum = sel[2];

            // Add style for topNode (commonAncestorContainer) just in case
            // we got no wrapping div
            var refNode = topNode;
            if (refNode.nodeType === 3) // text node
                refNode = refNode.parentNode;
            var cls = "selection-" + selectionNum;
            var css = getNodeStyle(refNode, true); // don't get non-inheritable properties
            var styleString = styleToString(css);
            cssClassesToTmpIds[cls] = cls;
            tmpIdsToNewCss[cls] = css;
            styleLookup[ styleString ] = cls;

            $(topNode).find('*').each((i, pre) => {
                let $pre = $(pre);
                // Skip nodes that are not part of our selection (to avoid
                // useless but expensive css() calls on them).
                if ( range && !(range.intersectsNode(pre)) ) {
                    return;
                }

                if (allowedTags.indexOf(pre.tagName.toLowerCase()) < 0) return;
                if (mathMLTags.indexOf(pre.tagName.toLowerCase()) > -1) return;

                if (!$pre.is(':visible')) {
                    $pre.replaceWith('');
                } else {
                    if (pre.tagName.toLowerCase() === 'svg') return;

                    // Find a friendly and not too remote name for the class we'll create
                    let classNames = pre.getAttribute('class');
                    if (!classNames) {
                        classNames = pre.getAttribute('id');
                    }
                    if (classNames) {
                        classNames = classNames.replace(/\s/g,'_'); // MM: merge multiple classNames or bad IDs
                        // MM: materialize class per tag
                        classNames = pre.tagName.toLowerCase() + '-' + classNames;
                    }
                    else {
                        // MM: use the path as ul.li and ol.li need different list-style-type for example.
                        classNames =  pre.parentNode.tagName.toLowerCase() + '_' + pre.tagName.toLowerCase();
                    }

                    var tmpNewCss = getNodeStyle(pre);
                    var styleString = styleToString(tmpNewCss);
                    // We ignore empty styles and don't set any class name on nodes with no style
                    if ( styleString != "" ) {
                        var tmpId = styleLookup[styleString];
                        if ( tmpId === undefined ) { // not yet seen
                            var cls = classNames;
                            var num = 1;
                            while (true) {
                                tmpId = cssClassesToTmpIds[cls];
                                if (tmpId === undefined ) { // cls available
                                   tmpId = cls;
                                   cssClassesToTmpIds[cls] = tmpId;
                                   tmpIdsToNewCss[tmpId] = tmpNewCss;
                                   styleLookup[ styleString ] = tmpId;
                                   break;
                                }
                                num++;
                                cls = classNames + '_' + num;
                            }
                        }
                        pre.setAttribute('data-class', tmpId);
                    }
                }
            });
            // cleanup any .data("style_fetched") in case we'll work again on this page
            $(topNode).find('*').removeData("style_fetched");
            $(topNode.parentNode).removeData("style_fetched");
            $(topNode.parentNode.parentNode).removeData("style_fetched");
        });
        // console.log(Date.now(), "extractCss() done.\n");
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
        pageSrc = document.getElementsByTagName('body')[0];
        styleFile = extractCss(pageSrc, null, request.includeStyle, request.appliedStyles)
        tmpContent = getContent(pageSrc, "selection-body");
    } else if (request.type === 'extract-selection') {
        // We may have multiple selections
        var selections = window.getSelection();
        styleFile = extractCss(null, selections, request.includeStyle, request.appliedStyles)
        for (var i = 0; i < selections.rangeCount; i++) {
            var divClassName = "selection-" + (i+1);
            tmpContent += getContent(selections.getRangeAt(i).cloneContents(), divClassName);
        }
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
