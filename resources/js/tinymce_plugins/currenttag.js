(function(tinymce) {
	tinymce.create('tinymce.plugins.CurrentTag', {
		init: function(ed, url) {
			var t = this;
			t.url = url;
			t.editor = ed;
			
			ed.onNodeChange.add(function(ed, cm, e) {
				if (e.nodeType == 1) {
					var currentNode = e.getAttribute('_display');
					if (currentNode == null) currentNode = e.nodeName.toLowerCase();
					$('#editor_currentTagButton .mceIcon').html(currentNode);
				}
			});
			
			ed.addCommand('closeCurrentTag', function() {
				var node = t.editor.currentNode;
				if (node.getAttribute('_struct')) {
					if ($(node).text() == '') {
						var id = node.getAttribute('id');
						t.editor.execCommand('removeTag', id);
					} else {
						var range = t.editor.selection.getRng(true);
						if (node.nextSibling) {
							range.setStart(node.nextSibling, 0);
							range.setEnd(node.nextSibling, 0);
						} else {
							range.setStartAfter(node);
							range.setEndAfter(node);
						}
					}
				}
				// TODO add entity handling
			});
		},
		createControl: function(n, cm) {
			if (n == 'currenttag') {
				var t = this;
				var c = cm.createButton('currentTagButton', {
					title: 'Current Tag',
					'class': 'currentTagButton',
					onclick: function() {
						t.editor.execCommand('closeCurrentTag');
					}
				});
				
				return c;
			}
	
			return null;
		}
	});
	
	tinymce.PluginManager.add('currenttag', tinymce.plugins.CurrentTag);
})(tinymce);