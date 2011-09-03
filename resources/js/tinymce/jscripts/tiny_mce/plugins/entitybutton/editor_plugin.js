(function(tinymce) {
	tinymce.create('tinymce.plugins.EntityButtons', {
		init: function(ed, url) {
			var t = this;
			t.url = url;
			t.editor = ed;
		},
		createControl: function(n, cm) {
			if (n == 'entitybuttons') {
				var t = this;
				var url = t.url+'/../../../../../../img/';
				var c = cm.createMenuButton('entityActions', {
					title: 'Tag Entity',
					image: url+'script_add.png',
					'class': 'entityButton'
				});
				c.onRenderMenu.add(function(c, m) {
					m.add({
						title: 'Tag Person',
						icon_src: url+'user.png',
						onclick : function() {
							t.editor.execCommand('addEntity', 'person');
						}
					});
					m.add({
						title: 'Tag Place',
						icon_src: url+'world.png',
						onclick : function() {
							t.editor.execCommand('addEntity', 'place');
						}
					});
					m.add({
						title: 'Tag Date',
						icon_src: url+'calendar.png',
						onclick : function() {
							t.editor.execCommand('addEntity', 'date');
						}
					});
					m.add({
						title: 'Tag Event',
						icon_src: url+'cake.png',
						onclick : function() {
							t.editor.execCommand('addEntity', 'event');
						}
					});
					m.add({
						title: 'Tag Organization',
						icon_src: url+'building.png',
						onclick : function() {
							t.editor.execCommand('addEntity', 'org');
						}
					});
					m.add({
						title: 'Tag Citation',
						icon_src: url+'book.png',
						onclick : function() {
							t.editor.execCommand('addEntity', 'citation');
						}
					});
					m.add({
						title: 'Tag Note',
						icon_src: url+'pencil.png',
						onclick : function() {
							t.editor.execCommand('addEntity', 'note');
						}
					});
				});
				
				return c;
			}
	
			return null;
		}
	});
	
	tinymce.PluginManager.add('entitybuttons', tinymce.plugins.EntityButtons);
})(tinymce);