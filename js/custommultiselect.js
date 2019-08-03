/*
 * @license
 *
 * CustomMultiselect v2.3.12
 * http://crlcu.github.io/multiselect/
 *
 * Copyright (c) 2019 Sachchi Prajapati
 * Licensed under the MIT license (https://github.com/crlcu/multiselect/blob/master/LICENSE)
 */


if (typeof jQuery === 'undefined') {
    throw new Error('custommultiselect requires jQuery');
}

; (function ($) {
    'use strict';

    var version = $.fn.jquery.split(' ')[0].split('.');

    if (version[0] < 2 && version[1] < 7) {
        throw new Error('custommultiselect requires jQuery version 1.7 or higher');
    }
})(jQuery);

; (function (factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module depending on jQuery.
        define(['jquery'], factory);
    } else {
        // No AMD. Register plugin with global jQuery object.
        factory(jQuery);
    }
}(function ($) {
    'use strict';

    var CustomMultiselect = (function ($) {
        /** CustomMultiselect object constructor
         *
         *  @class CustomMultiselect
         *  @constructor
        **/
        function CustomMultiselect($select, settings) {
            var id = $select.prop('id');
            this.$left = $select;
            this.$right = $(settings.right).length ? $(settings.right) : $('#' + id + '_to');
            this.actions = {
                $leftAll: $(settings.leftAll).length ? $(settings.leftAll) : $('#' + id + '_leftAll'),
                $rightAll: $(settings.rightAll).length ? $(settings.rightAll) : $('#' + id + '_rightAll'),
                $leftSelected: $(settings.leftSelected).length ? $(settings.leftSelected) : $('#' + id + '_leftSelected'),
                $rightSelected: $(settings.rightSelected).length ? $(settings.rightSelected) : $('#' + id + '_rightSelected'),

                $undo: $(settings.undo).length ? $(settings.undo) : $('#' + id + '_undo'),
                $redo: $(settings.redo).length ? $(settings.redo) : $('#' + id + '_redo'),

                $moveUp: $(settings.moveUp).length ? $(settings.moveUp) : $('#' + id + '_move_up'),
                $moveDown: $(settings.moveDown).length ? $(settings.moveDown) : $('#' + id + '_move_down')
            };

            delete settings.leftAll;
            delete settings.leftSelected;
            delete settings.right;
            delete settings.rightAll;
            delete settings.rightSelected;
            delete settings.undo;
            delete settings.redo;
            delete settings.moveUp;
            delete settings.moveDown;

            this.options = {
                keepRenderingSort: settings.keepRenderingSort,
                submitAllLeft: settings.submitAllLeft !== undefined ? settings.submitAllLeft : true,
                submitAllRight: settings.submitAllRight !== undefined ? settings.submitAllRight : true,
                search: settings.search,
                ignoreDisabled: settings.ignoreDisabled !== undefined ? settings.ignoreDisabled : false,
                matchOptgroupBy: settings.matchOptgroupBy !== undefined ? settings.matchOptgroupBy : 'label'
            };

            delete settings.keepRenderingSort, settings.submitAllLeft, settings.submitAllRight, settings.search, settings.ignoreDisabled, settings.matchOptgroupBy;

            this.callbacks = settings;

            this.init();
        }

        CustomMultiselect.prototype = {
            init: function () {
                var self = this;
                self.undoStack = [];
                self.redoStack = [];

                if (self.options.keepRenderingSort) {
                    self.skipInitSort = true;

                    if (self.callbacks.sort !== false) {
                        self.callbacks.sort = function (a, b) {
                            return $(a).data('position') > $(b).data('position') ? 1 : -1;
                        };
                    }

                    self.$left.attachIndex();

                    self.$right.each(function (i, select) {
                        $(select).attachIndex();
                    });
                }

                if (typeof self.callbacks.startUp == 'function') {
                    self.callbacks.startUp(self.$left, self.$right);
                }

                if (!self.skipInitSort && typeof self.callbacks.sort == 'function') {
                    self.$left.mSort(self.callbacks.sort);

                    self.$right.each(function (i, select) {
                        $(select).mSort(self.callbacks.sort);
                    });
                }

                // Append left filter
                if (self.options.search && self.options.search.left) {
                    self.options.search.$left = $(self.options.search.left);
                    self.$left.before(self.options.search.$left);
                }

                // Append right filter
                if (self.options.search && self.options.search.right) {
                    self.options.search.$right = $(self.options.search.right);
                    self.$right.before($(self.options.search.$right));
                }

                // Initialize events
                self.events();
            },

            events: function () {
                var self = this;


                // Attach event for double clicking on options from left side
                self.$left.on('dblclick', 'li', function (e) {
                    e.preventDefault();

                    //var $options = self.$left.find('option:selected');
                    var $options = self.$left.find('li.' + self.callbacks.activeclassName);

                    if ($options.length) {
                        self.moveToRight($options, e);
                    }
                });

                // Attach event for pushing ENTER on options from left side
                self.$left.on('keypress', function (e) {
                    if (e.keyCode === 13) {
                        e.preventDefault();

                        //var $options = self.$left.find('option:selected');
                        var $options = self.$left.find('li.' + self.callbacks.activeclassName);

                        if ($options.length) {
                            self.moveToRight($options, e);
                        }
                    }
                });

                // Attach event for double clicking on options from right side
                self.$right.on('dblclick', 'li', function (e) {
                    e.preventDefault();

                    //var $options = self.$right.find('option:selected');
                    var $options = self.$right.find('li.' + self.callbacks.activeclassName);

                    if ($options.length) {
                        self.moveToLeft($options, e);
                    }
                });

                // Attach event for pushing BACKSPACE or DEL on options from right side
                self.$right.on('keydown', function (e) {
                    if (e.keyCode === 8 || e.keyCode === 46) {
                        e.preventDefault();

                        //var $options = self.$right.find('option:selected');
                        var $options = self.$right.find('li.' + self.callbacks.activeclassName);

                        if ($options.length) {
                            self.moveToLeft($options, e);
                        }
                    }
                });

                // dblclick support for IE
                if (navigator.userAgent.match(/MSIE/i) || navigator.userAgent.indexOf('Trident/') > 0 || navigator.userAgent.indexOf('Edge/') > 0) {
                    self.$left.dblclick(function (e) {
                        self.actions.$rightSelected.trigger('click');
                    });

                    self.$right.dblclick(function (e) {
                        self.actions.$leftSelected.trigger('click');
                    });
                }

                self.actions.$rightSelected.on('click', function (e) {
                    e.preventDefault();

                    //var $options = self.$left.find('option:selected');
                    var $options = self.$left.find('li.' + self.callbacks.activeclassName);

                    if ($options.length) {
                        self.moveToRight($options, e);
                    }

                    $(this).blur();
                });

                self.actions.$leftSelected.on('click', function (e) {
                    e.preventDefault();

                    //var $options = self.$right.find('option:selected');
                    var $options = self.$right.find('li.'+ self.callbacks.activeclassName);

                    if ($options.length) {
                        self.moveToLeft($options, e);
                    }

                    $(this).blur();
                });

                self.actions.$rightAll.on('click', function (e) {
                    e.preventDefault();

                    var $options = self.$left.children(':not(span):not(.hidden)');

                    if ($options.length) {
                        self.moveToRight($options, e);
                    }

                    $(this).blur();
                });

                self.actions.$leftAll.on('click', function (e) {
                    e.preventDefault();

                    var $options = self.$right.children(':not(span):not(.hidden)');

                    if ($options.length) {
                        self.moveToLeft($options, e);
                    }

                    $(this).blur();
                });

                self.actions.$undo.on('click', function (e) {
                    e.preventDefault();

                    self.undo(e);
                });

                self.actions.$redo.on('click', function (e) {
                    e.preventDefault();

                    self.redo(e);
                });

                self.actions.$moveUp.on('click', function (e) {
                    e.preventDefault();

                    //var $options = self.$right.find(':selected:not(span):not(.hidden)');
                    var $options = self.$right.find('.'+ self.callbacks.activeclassName);
                    if ($options.length) {
                        self.moveUp($options, e);
                    }

                    $(this).blur();
                });

                self.actions.$moveDown.on('click', function (e) {
                    e.preventDefault();

                    //var $options = self.$right.find(':selected:not(span):not(.hidden)');
                    var $options = self.$right.find('.' + self.callbacks.activeclassName);

                    if ($options.length) {
                        self.moveDown($options, e);
                    }

                    $(this).blur();
                });
            },

            moveToRight: function ($options, event, silent, skipStack) {
                var self = this;

                if (typeof self.callbacks.moveToRight == 'function') {
                    return self.callbacks.moveToRight(self, $options, event, silent, skipStack);
                } else {
                    if (typeof self.callbacks.beforeMoveToRight == 'function' && !silent) {
                        if (!self.callbacks.beforeMoveToRight(self.$left, self.$right, $options)) {
                            return false;
                        }
                    }

                    self.moveFromAtoB(self.$left, self.$right, $options, event, silent, skipStack);

                    if (!skipStack) {
                        self.undoStack.push(['right', $options]);
                        self.redoStack = [];
                    }

                    if (typeof self.callbacks.sort == 'function' && !silent && !self.doNotSortRight) {
                        self.$right.mSort(self.callbacks.sort);
                    }

                    if (typeof self.callbacks.afterMoveToRight == 'function' && !silent) {
                        self.callbacks.afterMoveToRight(self.$left, self.$right, $options);
                    }

                    return self;
                }
            },

            moveToLeft: function ($options, event, silent, skipStack) {
                var self = this;

                if (typeof self.callbacks.moveToLeft == 'function') {
                    return self.callbacks.moveToLeft(self, $options, event, silent, skipStack);
                } else {
                    if (typeof self.callbacks.beforeMoveToLeft == 'function' && !silent) {
                        if (!self.callbacks.beforeMoveToLeft(self.$left, self.$right, $options)) {
                            return false;
                        }
                    }

                    self.moveFromAtoB(self.$right, self.$left, $options, event, silent, skipStack);

                    if (!skipStack) {
                        self.undoStack.push(['left', $options]);
                        self.redoStack = [];
                    }

                    if (typeof self.callbacks.sort == 'function' && !silent) {
                        self.$left.mSort(self.callbacks.sort);
                    }

                    if (typeof self.callbacks.afterMoveToLeft == 'function' && !silent) {
                        self.callbacks.afterMoveToLeft(self.$left, self.$right, $options);
                    }

                    return self;
                }
            },

            moveFromAtoB: function ($source, $destination, $options, event, silent, skipStack) {
                var self = this;

                $options.each(function (index, option) {
                    var $option = $(option);

                    //if (self.options.ignoreDisabled && $option.is(':disabled')) {
                    if ($option.hasClass("disabled")) {
                        return true;
                    }

                    $destination.move($option, self);
                });

                return self;
            },

            moveUp: function ($options) {
                var self = this;

                if (typeof self.callbacks.beforeMoveUp == 'function') {
                    if (!self.callbacks.beforeMoveUp($options)) {
                        return false;
                    }
                }

                $options.first().prev().before($options);

                if (typeof self.callbacks.afterMoveUp == 'function') {
                    self.callbacks.afterMoveUp($options);
                }
            },

            moveDown: function ($options) {
                var self = this;

                if (typeof self.callbacks.beforeMoveDown == 'function') {
                    if (!self.callbacks.beforeMoveDown($options)) {
                        return false;
                    }
                }

                $options.last().next().after($options);

                if (typeof self.callbacks.afterMoveDown == 'function') {
                    self.callbacks.afterMoveDown($options);
                }
            },

            undo: function (event) {
                var self = this;
                var last = self.undoStack.pop();

                if (last) {
                    self.redoStack.push(last);

                    switch (last[0]) {
                        case 'left':
                            self.moveToRight(last[1], event, false, true);
                            break;
                        case 'right':
                            self.moveToLeft(last[1], event, false, true);
                            break;
                    }
                }
            },

            redo: function (event) {
                var self = this;
                var last = self.redoStack.pop();

                if (last) {
                    self.undoStack.push(last);

                    switch (last[0]) {
                        case 'left':
                            self.moveToLeft(last[1], event, false, true);
                            break;
                        case 'right':
                            self.moveToRight(last[1], event, false, true);
                            break;
                    }
                }
            }
        }

        return CustomMultiselect;
    })($);

    $.custommultiselect = {

        defaults: {
            /** will be executed once - remove from $left all options that are already in $right
             *
             *  @method startUp
             *  @attribute $left jQuery object
             *  @attribute $right jQuery object
            **/
            activeclassName : 'active',
            startUp: function () {
           
            },

            /** will be executed each time before moving option[s] to right
             *
             *  IMPORTANT : this method must return boolean value
             *      true    : continue to moveToRight method
             *      false   : stop
             *
             *  @method beforeMoveToRight
             *  @attribute $left jQuery object
             *  @attribute $right jQuery object
             *  @attribute $options HTML object (the option[s] which was selected to be moved)
             *
             *  @default true
             *  @return {boolean}
            **/
            beforeMoveToRight: function ($left, $right, $options) { return true; },

            /*  will be executed each time after moving option[s] to right
             *
             *  @method afterMoveToRight
             *  @attribute $left jQuery object
             *  @attribute $right jQuery object
             *  @attribute $options HTML object (the option[s] which was selected to be moved)
            **/
            afterMoveToRight: function ($left, $right, $options) { },

            /** will be executed each time before moving option[s] to left
             *
             *  IMPORTANT : this method must return boolean value
             *      true    : continue to moveToRight method
             *      false   : stop
             *
             *  @method beforeMoveToLeft
             *  @attribute $left jQuery object
             *  @attribute $right jQuery object
             *  @attribute $options HTML object (the option[s] which was selected to be moved)
             *
             *  @default true
             *  @return {boolean}
            **/
            beforeMoveToLeft: function ($left, $right, $options) { return true; },

            /*  will be executed each time after moving option[s] to left
             *
             *  @method afterMoveToLeft
             *  @attribute $left jQuery object
             *  @attribute $right jQuery object
             *  @attribute $options HTML object (the option[s] which was selected to be moved)
            **/
            afterMoveToLeft: function ($left, $right, $options) { },

            /** will be executed each time before moving option[s] up
             *
             *  IMPORTANT : this method must return boolean value
             *      true    : continue to moveUp method
             *      false   : stop
             *
             *  @method beforeMoveUp
             *  @attribute $options HTML object (the option[s] which was selected to be moved)
             *
             *  @default true
             *  @return {boolean}
            **/
            beforeMoveUp: function ($options) { return true; },

            /*  will be executed each time after moving option[s] up
             *
             *  @method afterMoveUp
             *  @attribute $left jQuery object
             *  @attribute $right jQuery object
             *  @attribute $options HTML object (the option[s] which was selected to be moved)
            **/
            afterMoveUp: function ($options) { },

            /** will be executed each time before moving option[s] down
             *
             *  IMPORTANT : this method must return boolean value
             *      true    : continue to moveUp method
             *      false   : stop
             *
             *  @method beforeMoveDown
             *  @attribute $options HTML object (the option[s] which was selected to be moved)
             *
             *  @default true
             *  @return {boolean}
            **/
            beforeMoveDown: function ($options) { return true; },

            /*  will be executed each time after moving option[s] down
             *
             *  @method afterMoveUp
             *  @attribute $left jQuery object
             *  @attribute $right jQuery object
             *  @attribute $options HTML object (the option[s] which was selected to be moved)
            **/
            afterMoveDown: function ($options) { },

            /** sort options by option text
             *
             *  @method sort
             *  @attribute a HTML option
             *  @attribute b HTML option
             *
             *  @return 1/-1
            **/
            sort: function (a, b) {
                if (a.innerHTML == 'NA') {
                    return 1;
                } else if (b.innerHTML == 'NA') {
                    return -1;
                }

                return (a.innerHTML > b.innerHTML) ? 1 : -1;
            },

            /*  will tell if the search can start
             *
             *  @method fireSearch
             *  @attribute value String
             *
             *  @return {boolean}
            **/
            fireSearch: function (value) {
                return value.length > 1;
            }
        }
    };

    var ua = window.navigator.userAgent;
    var isIE = (ua.indexOf("MSIE ") + ua.indexOf("Trident/") + ua.indexOf("Edge/")) > -3;
    var isSafari = ua.toLowerCase().indexOf("safari") > -1;

    $.fn.custommultiselect = function (options) {
        return this.each(function () {
            var $this = $(this),
                data = $this.data('crlcu.custommultiselect'),
                settings = $.extend({}, $.custommultiselect.defaults, $this.data(), (typeof options === 'object' && options));

            if (!data) {
                $this.data('crlcu.custommultiselect', (data = new CustomMultiselect($this, settings)));
            }
        });
    };

    // append options
    // then set the selected attribute to false
    $.fn.move = function ($options, self) {
        //this
        //    .append($options)
        //    .find('option')
        //    .prop('selected', false);

        this
            .append($options.removeClass(self.callbacks.activeclassName));
        return this;
    };

    $.fn.removeIfEmpty = function () {
        if (!this.children().length) {
            this.remove();
        }

        return this;
    };

    $.fn.mShow = function () {
        this.removeClass('hidden').show();

        if (isIE || isSafari) {
            this.each(function (index, option) {
                // Remove <span> to make it compatible with IE
                if ($(option).parent().is('span')) {
                    $(option).parent().replaceWith(option);
                }

                $(option).show();
            });
        }

        return this;
    };

    $.fn.mHide = function () {
        this.addClass('hidden').hide();

        if (isIE || isSafari) {
            this.each(function (index, option) {
                // Wrap with <span> to make it compatible with IE
                if (!$(option).parent().is('span')) {
                    $(option).wrap('<span>').hide();
                }
            });
        }

        return this;
    };

    // sort options then reappend them to the select
    $.fn.mSort = function (callback) {
        this
            .children()
            .sort(callback)
            .appendTo(this);

        return this;
    };

    // attach index to children
    $.fn.attachIndex = function () {
        this.children().each(function (index, option) {
            var $option = $(option);
            $option.data('position', index);
        });
    };

    $.expr[":"].search = function (elem, index, meta) {
        var regex = new RegExp(meta[3], "i");

        return $(elem).text().match(regex);
    }
}));

