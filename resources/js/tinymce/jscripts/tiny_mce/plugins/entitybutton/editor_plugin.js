(function(tinymce) {
	tinymce.create('tinymce.plugins.EntityButton', {
		init: function(ed, url) {
			var t = this;
			t.url = url;
			t.editor = ed;
		},
		createControl: function(n, cm) {
			if (n == 'entitybutton') {
				var t = this;
				var url = t.url+'/../../../../../../img/';
				var c = cm.createMenuButton('entityActions', {
					title: 'Add Entity',
					image: url+'script_add.png',
					'class': 'entityButton'
				});
				c.onRenderMenu.add(function(c, m) {
					m.add({
						title: 'Add Person',
						icon_src: url+'user.png',
						onclick : function() {
							t.editor.execCommand('addEntity', 'person');
						}
					});
					m.add({
						title: 'Add Place',
						icon_src: url+'world.png',
						onclick : function() {
							t.editor.execCommand('addEntity', 'place');
						}
					});
					m.add({
						title: 'Add Date',
						icon_src: url+'calendar.png',
						onclick : function() {
							t.editor.execCommand('addEntity', 'date');
						}
					});
					m.add({
						title: 'Add Event',
						icon_src: url+'cake.png',
						onclick : function() {
							t.editor.execCommand('addEntity', 'event');
						}
					});
					m.add({
						title: 'Add Organization',
						icon_src: url+'building.png',
						onclick : function() {
							t.editor.execCommand('addEntity', 'org');
						}
					});
					m.add({
						title: 'Add Bib. Ref.',
						icon_src: url+'book.png',
						onclick : function() {
							t.editor.execCommand('addEntity', 'bibref');
						}
					});
					m.add({
						title: 'Add Note',
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
	
	tinymce.PluginManager.add('entitybutton', tinymce.plugins.EntityButton);
})(tinymce);