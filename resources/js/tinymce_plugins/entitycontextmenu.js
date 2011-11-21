/**
 * editor_plugin_src.js
 *
 * Copyright 2009, Moxiecode Systems AB
 * Released under LGPL License.
 *
 * License: http://tinymce.moxiecode.com/license
 * Contributing: http://tinymce.moxiecode.com/contributing
 */

(function() {
	var Event = tinymce.dom.Event, each = tinymce.each, DOM = tinymce.DOM;

	/**
	 * This plugin a context menu to TinyMCE editor instances.
	 *
	 * @class tinymce.plugins.ContextMenu
	 */
	tinymce.create('tinymce.plugins.EntityContextMenu', {
		/**
		 * Initializes the plugin, this will be executed after the plugin has been created.
		 * This call is done before the editor instance has finished it's initialization so use the onInit event
		 * of the editor instance to intercept that event.
		 *
		 * @method init
		 * @param {tinymce.Editor} ed Editor instance that the plugin is initialized in.
		 * @param {string} url Absolute URL to where the plugin is located.
		 */
		init : function(ed, url) {
			var t = this, showMenu, contextmenuNeverUseNative, realCtrlKey;
			t.url = url;
			t.editor = ed;
			t.curPos = {};

			contextmenuNeverUseNative = ed.settings.contextmenu_never_use_native;

			/**
			 * This event gets fired when the context menu is shown.
			 *
			 * @event onContextMenu
			 * @param {tinymce.plugins.EntityContextMenu} sender Plugin instance sending the event.
			 * @param {tinymce.ui.DropMenu} menu Drop down menu to fill with more items if needed.
			 */
			t.onContextMenu = new tinymce.util.Dispatcher(this);

			showMenu = ed.onContextMenu.add(function(ed, e) {
				// Block TinyMCE menu on ctrlKey and work around Safari issue
				if ((realCtrlKey !== 0 ? realCtrlKey : e.ctrlKey) && !contextmenuNeverUseNative)
					return;

				Event.cancel(e);

				// Select the image if it's clicked. WebKit would other wise expand the selection
				if (e.target.nodeName == 'IMG') ed.selection.select(e.target);
				
				var editorPos = ed.$(ed.contentAreaContainer).offset();
				t.curPos = ed.contextMenuPos = {x: (e.clientX || e.pageX) + editorPos.left, y: (e.clientY || e.pageX) + editorPos.top};

				t._getMenu(ed).showMenu(e.clientX || e.pageX, e.clientY || e.pageX);
				Event.add(ed.getDoc(), 'click', function(e) {
					hide(ed, e);
				});

				ed.nodeChanged();
			});

			ed.onRemove.add(function() {
				if (t._menu)
					t._menu.removeAll();
			});

			function hide(ed, e) {
				realCtrlKey = 0;

				// Since the contextmenu event moves
				// the selection we need to store it away
				if (e && e.button == 2) {
					realCtrlKey = e.ctrlKey;
					return;
				}

				if (t._menu) {
					t._menu.removeAll();
					t._menu.destroy();
					Event.remove(ed.getDoc(), 'click', hide);
				}
			};

			ed.onMouseDown.add(hide);
			ed.onKeyDown.add(hide);
			ed.onKeyDown.add(function(ed, e) {
				if (e.shiftKey && !e.ctrlKey && !e.altKey && e.keyCode === 121) {
					Event.cancel(e);
					showMenu(ed, e);
				}
			});
		},

		_getMenu : function(ed) {
			var t = this, m = t._menu, se = ed.selection, col = se.isCollapsed(), el = se.getNode() || ed.getBody(), am, p1, p2;

			if (m) {
				m.removeAll();
				m.destroy();
			}

			p1 = DOM.getPos(ed.getContentAreaContainer());
			p2 = DOM.getPos(ed.getContainer());

			m = ed.controlManager.createDropMenu('contextmenu', {
				offset_x : p1.x + ed.getParam('contextmenu_offset_x', 0),
				offset_y : p1.y + ed.getParam('contextmenu_offset_y', 0),
				constrain : 1,
				keyboard_focus: true
			});
			
			t._menu = m;

			var url = t.url+'/../../img/';
			var tagMenu = m.addMenu({
				title: 'Structural Tags',
				icon_src: url+'tag.png'
			});
			tagMenu.add({
				title: 'Paragraph',
				icon_src: url+'para.png',
				onclick : function() {
					ed.execCommand('addCustomTag', 'para', t.curPos);
				}
			}).setDisabled(col);
			tagMenu.add({
				title: 'Heading',
				icon_src: url+'heading.png',
				onclick : function() {
					ed.execCommand('addCustomTag', 'head', t.curPos);
				}
			}).setDisabled(col);
			tagMenu.add({
				title: 'Emphasized',
				icon_src: url+'text_italic.png',
				onclick : function() {
					ed.execCommand('addCustomTag', 'emph', t.curPos);
				}
			}).setDisabled(col);
//			tagMenu.add({
//				title: 'Title',
//				icon_src: url+'title.png',
//				onclick : function() {
//					ed.execCommand('addCustomTag', 'title', t.curPos);
//				}
//			}).setDisabled(col);
			tagMenu.add({
				title: 'Quotation',
				icon_src: url+'quote.png',
				onclick : function() {
					ed.execCommand('addCustomTag', 'quote', t.curPos);
				}
			}).setDisabled(col);
			m.addSeparator();
			m.add({
				title: 'Tag Person',
				icon_src: url+'user.png',
				onclick : function() {
					ed.execCommand('addEntity', 'person');
				}
			}).setDisabled(col);
			m.add({
				title: 'Tag Place',
				icon_src: url+'world.png',
				onclick : function() {
					ed.execCommand('addEntity', 'place');
				}
			}).setDisabled(col);
			m.add({
				title: 'Tag Date',
				icon_src: url+'calendar.png',
				onclick : function() {
					ed.execCommand('addEntity', 'date');
				}
			}).setDisabled(col);
			m.add({
				title: 'Tag Event',
				icon_src: url+'cake.png',
				onclick : function() {
					ed.execCommand('addEntity', 'event');
				}
			}).setDisabled(col);
			m.add({
				title: 'Tag Organization',
				icon_src: url+'group.png',
				onclick : function() {
					ed.execCommand('addEntity', 'org');
				}
			}).setDisabled(col);
			m.add({
				title: 'Tag Citation',
				icon_src: url+'vcard.png',
				onclick : function() {
					ed.execCommand('addEntity', 'citation');
				}
			}).setDisabled(col);
			m.add({
				title: 'Tag Note',
				icon_src: url+'note.png',
				onclick : function() {
					ed.execCommand('addEntity', 'note');
				}
			}).setDisabled(col);
			m.add({
				title: 'Tag Text/Title',
				icon_src: url+'book.png',
				onclick : function() {
					ed.execCommand('addCustomTag', 'title', t.curPos);
				}
			}).setDisabled(col);
			col = (ed.currentEntity == null && ed.currentStruct == null);
			m.addSeparator();
			m.add({
				title: 'Edit Tag',
				icon_src: url+'tag_blue_edit.png',
				onclick : function() {
					ed.execCommand('editTag', null, t.curPos);
				}
			}).setDisabled(col);
			m.add({
				title: 'Remove Tag',
				icon_src: url+'cross.png',
				onclick : function() {
					ed.execCommand('removeTag');
				}
			}).setDisabled(col);

			t.onContextMenu.dispatch(t, m, el, col);

			return m;
		}
	});

	// Register plugin
	tinymce.PluginManager.add('entitycontextmenu', tinymce.plugins.EntityContextMenu);
})();
