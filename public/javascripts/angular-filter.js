/* global angular */
angular.module('quassel')
.filter('decoratenick', ['stripnickFilter', function(stripnick) {
    var MT = require('message').Type;

    return function(message) {
        var sender;
        switch(message.type) {
            case MT.Nick:
                sender = '<->';
                break;
            case MT.Mode:
                sender = '***';
                break;
            case MT.Join:
                sender = '-->';
                break;
            case MT.Part:
                sender = '<--';
                break;
            case MT.Quit:
                sender = '<--';
                break;
            case MT.Kick:
                sender = '<-*';
                break;
            case MT.Server:
                sender = stripnick(message.sender) || "*";
                break;
            case MT.Topic:
                sender = '*';
                break;
            case MT.NetsplitJoin:
                sender = '=>';
                break;
            case MT.NetsplitQuit:
                sender = '<=';
                break;
            case MT.DayChange:
                sender = '-';
                break;
            default:
                sender = stripnick(message.sender);
        }
        return sender;
    };
}])
.filter('channelsFilter', function() {
    return function(input) {
        input = input || [];
        var out = input.filter(function(elt){
            return !elt._isStatusBuffer;
        });
        out.sort(function(a, b){
            return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
        });

        return out;
    };
})
.filter('stripnick', function() {
    return function(input) {
        if (typeof input === 'string') {
            var ind = input.indexOf('!');
            if (ind !== -1) {
                return input.slice(0, ind);
            }
            return input;
        }
        return '';
    };
})
.filter('duration', function() {
    return function(input) {
        var dateObject = null;
        if (input instanceof Date) {
            dateObject = input;
        } else {
            dateObject = new Date(input);
        }
        var h = dateObject.getHours(), m = dateObject.getMinutes(), s = dateObject.getSeconds();
        if (h < 10) h = '0'+h;
        if (m < 10) m = '0'+m;
        if (s < 10) s = '0'+s;
        return [h, m, s].join(':');
    };
})
.filter('color', function() {
    var COLOR = new RegExp("^" + String.fromCharCode(3) + "(([0-9]{1,2})(,([0-9]{1,2}))?)");
    return function(input) {
        var out = '',
        contextAttributes = {
            bold: false,
            italic: false,
            underline: false,
            bgcolor: false,
            fgcolor: false
        },
        i = 0,
        tagOpened = false,
        match;
        input = input || '';

        var openSpan = function (classes) {
            return '<span class="' + classes + '">';
        };

        var closeSpan = function () {
            return '</span>';
        };

        var unescapeColorTags = function(str) {
            var tagsToReplace = {
                '&#2;': '\x02',
                '&#29;': '\x1D',
                '&#31;': '\x1F',
                '&#3;': '\x03',
                '&#15;': '\x0F'
            };
            var re = /&#(2|29|3|31|15);/g;
            return str.replace(re, function (tag) {
                return tagsToReplace[tag] || tag;
            });
        };

        var getClasses = function () {
            var prop, ret = [];
            for (prop in contextAttributes) {
                if (contextAttributes[prop] !== false) {
                    ret.push(contextAttributes[prop]);
                }
            }
            return ret;
        };

        var getTags = function() {
            var ret = "", classes = getClasses();
            if (tagOpened) {
                ret += closeSpan();
                tagOpened = false;
            }
            if (classes.length > 0) {
                ret += openSpan(classes.join(" "));
                tagOpened = true;
            }
            return ret;
        };

        input = unescapeColorTags(input);

        for (i = 0; i < input.length; i++) {
            switch (input[i]) {
                case '\x02':
                    contextAttributes.bold = contextAttributes.bold ? false : 'mirc-bold';
                    out += getTags();
                    break;
                case '\x1D':
                    contextAttributes.italic = contextAttributes.italic ? false : 'mirc-italic';
                    out += getTags();
                    break;
                case '\x1F':
                    contextAttributes.underline = contextAttributes.underline ? false : 'mirc-underline';
                    out += getTags();
                    break;
                case '\x03':
                    match = input.substr(i, 6).match(COLOR);
                    if (match) {
                        i += match[1].length;
                        // 2 & 4
                        contextAttributes.fgcolor = "mirc-fg-" + parseInt(match[2], 10);
                        if (match[4]) {
                            contextAttributes.bgcolor = "mirc-bg-" + parseInt(match[4], 10);
                        }
                    } else {
                        contextAttributes.bgcolor = false;
                        contextAttributes.fgcolor = false;
                    }
                    out += getTags();
                    break;
                case '\x0F':
                    contextAttributes.bold = contextAttributes.italic = contextAttributes.underline = contextAttributes.fgcolor = contextAttributes.bgcolor = false;
                    out += getTags();
                    break;
                default:
                    out += input[i];
                    break;
            }
        }
        if (tagOpened) {
            out += closeSpan();
        }
        return out;
    };
})
.filter('escape', function() {
    var tagsToReplace = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        '\'': '&#x27;',
        '/': '&#x2F;'
    }, re = /[&<>]/g;
    return function(input) {
        if (typeof input === 'string') {
            return input.replace(re, function (tag) {
                return tagsToReplace[tag] || tag;
            });
        }
        return '';
    };
})
.filter('hash', function() {
    return function(input) {
        if (!input) return null;
        var hash = 5381, i, chr, len;
        for (i = 0, len = input.length; i < len; i++) {
            chr   = input.charCodeAt(i);
            hash  = ((hash << 5) + hash) + chr;
        }
        return Math.abs(hash) % 16;
    };
})
.filter('ordernicks', function() {
    return function(users, buffer) {
        if (!users || buffer === null) return users;
        var op = [], voiced = [], other = [];

        users.forEach(function(value) {
            var user = value.user;
            if (buffer.isOp(user.nick)) op.push(user);
            else if (buffer.isVoiced(user.nick)) voiced.push(user);
            else other.push(user);
        });

        function sortNicks(a, b){
            return a.nick.toLowerCase().localeCompare(b.nick.toLowerCase());
        }

        op.sort(sortNicks);
        voiced.sort(sortNicks);
        other.sort(sortNicks);
        return op.concat(voiced, other);
    };
});
