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
				if (e.target.nodeName == 'IMG')
					ed.selection.select(e.target);

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
				ed.contextMenuPos = {x: e.clientX || e.pageX, y: e.clientY || e.pageX}; 
				
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

			var d = se.isCollapsed();
			var url = t.url+'/../../../../../../img/';
			var tagMenu = m.addMenu({
				title: 'Tags',
				icon_src: url+'tag.png'
			});
			tagMenu.add({
				title: 'Paragraph',
				icon_src: url+'para.gif',
				onclick : function() {
					ed.execCommand('addCustomTag', 'para');
				}
			}).setDisabled(d);
			tagMenu.add({
				title: 'Heading',
				icon_src: url+'heading.png',
				onclick : function() {
					ed.execCommand('addCustomTag', 'head');
				}
			}).setDisabled(d);
			tagMenu.add({
				title: 'Emphasized',
				icon_src: url+'text_italic.png',
				onclick : function() {
					ed.execCommand('addCustomTag', 'emph');
				}
			}).setDisabled(d);
			tagMenu.add({
				title: 'Title',
				icon_src: url+'title.gif',
				onclick : function() {
					ed.execCommand('addCustomTag', 'title');
				}
			}).setDisabled(d);
			tagMenu.add({
				title: 'Quotation',
				icon_src: url+'quote.png',
				onclick : function() {
					ed.execCommand('addCustomTag', 'quote');
				}
			}).setDisabled(d);
			m.addSeparator();
			m.add({
				title: 'Add Person',
				icon_src: url+'user.png',
				cmd: 'add_person'
			}).setDisabled(d);
			m.add({
				title: 'Add Place',
				icon_src: url+'world.png',
				cmd: 'add_place'
			}).setDisabled(d);
			m.add({
				title: 'Add Date',
				icon_src: url+'calendar.png',
				cmd: 'add_date'
			}).setDisabled(d);
			m.add({
				title: 'Add Event',
				icon_src: url+'cake.png',
				cmd: 'add_event'
			}).setDisabled(d);
			m.add({
				title: 'Add Organization',
				icon_src: url+'building.png',
				cmd: 'add_org'
			}).setDisabled(d);
			m.add({
				title: 'Add Bib. Ref.',
				icon_src: url+'book.png',
				cmd: 'add_bibref'
			}).setDisabled(d);
			m.add({
				title: 'Add Note',
				icon_src: url+'pencil.png',
				cmd: 'add_note'
			}).setDisabled(d);
			d = ed.currentEntity == null;
			m.addSeparator();
			m.add({
				title: 'Remove Entity',
				icon_src: url+'delete.png',
				cmd: 'remove_entity'
			}).setDisabled(d);

			t.onContextMenu.dispatch(t, m, el, col);

			return m;
		}
	});

	// Register plugin
	tinymce.PluginManager.add('entitycontextmenu', tinymce.plugins.EntityContextMenu);
})();
