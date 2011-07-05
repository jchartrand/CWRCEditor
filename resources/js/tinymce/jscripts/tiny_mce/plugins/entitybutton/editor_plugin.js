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
						cmd: 'add_person'
					});
					m.add({
						title: 'Add Place',
						icon_src: url+'world.png',
						cmd: 'add_place'
					});
					m.add({
						title: 'Add Date',
						icon_src: url+'calendar.png',
						cmd: 'add_date'
					});
					m.add({
						title: 'Add Event',
						icon_src: url+'cake.png',
						cmd: 'add_event'
					});
					m.add({
						title: 'Add Organization',
						icon_src: url+'building.png',
						cmd: 'add_org'
					});
					m.add({
						title: 'Add Bib. Ref.',
						icon_src: url+'book.png',
						cmd: 'add_bibref'
					});
					m.add({
						title: 'Add Note',
						icon_src: url+'pencil.png',
						cmd: 'add_note'
					});
				});
				
				return c;
			}
	
			return null;
		}
	});
	
	tinymce.PluginManager.add('entitybutton', tinymce.plugins.EntityButton);
})(tinymce);