(function(tinymce) {
	tinymce.create('tinymce.plugins.SchemaTags', {
		init: function(ed, url) {
			var t = this;
			t.url = url;
			t.editor = ed;
			t.currentKey = null;
			
			t.ADD = 0;
			t.EDIT = 1;
			t.mode = null;
			
			t.schema = null;
			
			t.tag = null;
			
			t.bm = null;
			
			ed.addCommand('addSchemaTag', function(key, pos) {
				var valid = ed.execCommand('isSelectionValid', true);
				if (valid != 2) {
					ed.execCommand('showError', valid);
					return;
				}
				
				var sel = ed.selection;
				var content = sel.getContent();
				var range = sel.getRng(true);
				if (range.startContainer == range.endContainer) {
					var leftTrimAmount = content.match(/^\s{0,1}/)[0].length;
					var rightTrimAmount = content.match(/\s{0,1}$/)[0].length;
					range.setStart(range.startContainer, range.startOffset+leftTrimAmount);
					range.setEnd(range.endContainer, range.endOffset-rightTrimAmount);
					sel.setRng(range);
				}
				
				t.bm = t.editor.selection.getBookmark();
				
				var entry = t.schema[key];
				if (entry.attributes.length == 1 && entry.attributes[0].name == 'id') {
					t.editor.execCommand('addStructureTag', t.bm, {
						'class': key,
						_tag: entry.elementName,
						_schema: true,
						_editable: false
					});
					t.editor.execCommand('updateStructureTree', true);
				} else {
					t.mode = t.ADD;
					t.showDialog(key, pos);
				}
			});
			
			ed.addCommand('editSchemaTag', function(tag, pos) {
				var val = tag.attr('class'); 
				t.currentKey = val;
				t.tag = tag;
				t.mode = t.EDIT;
				t.showDialog(val, pos);
			});
			
			$(document.body).append('<div id="schemaDialog"></div>');
			
			$('#schemaDialog').dialog({
				modal: true,
				resizable: false,
				closeOnEscape: false,
				open: function(event, ui) {
					$('#schemaDialog').parent().find('.ui-dialog-titlebar-close').hide();
				},
				height: 310,
				width: 435,
				autoOpen: false,
				buttons: {
					'Ok': function() {
						t.result();
					},
					'Cancel': function() {
						t.editor.selection.moveToBookmark(t.bm);
						$('#schemaDialog').dialog('close');
					}
				}
			});
		},
		showDialog: function(key, pos) {
			var t = this;
			t.currentKey = key;
			
			var entry = t.schema[key];
			var formString = '<form>';
			var attribute;
			
			$('#schemaDialog').empty();
			
			// build form from schema entry
			for (var i = 0; i < entry.attributes.length; i++) {
				attribute = entry.attributes[i];
				if (attribute.name != 'id') {
					formString += '<div><label>'+attribute.displayName+'</label>';
					var defaultVal = attribute.defaultValue == undefined ? '' : attribute.defaultValue;
					if (t.mode == t.EDIT) defaultVal = $(t.tag).attr(attribute.name);
					// select
					if (attribute.values) {
						formString += '<select name="'+attribute.name+'">';
						var attVal, selected;
						for (var j = 0; j < attribute.values.length; j++) {
							attVal = attribute.values[j];
							selected = defaultVal == attVal ? ' selected="selected"' : '';
							formString += '<option value="'+attVal+'"'+selected+'>'+attVal+'</option>';
						}
						formString += '</select></div>';
					// text input
					} else {
						formString += '<input type="text" name="'+attribute.name+'" value="'+defaultVal+'"/></div>';
					}
				} else {
					// formString += '<input type="hidden" name="id" value=""/>';
				}
			}
			formString += '</form>';
			
			$('#schemaDialog').append(formString);
			
			$('#schemaDialog input').keyup(function(event) {
				if (event.keyCode == '13') {
					event.preventDefault();
					t.result();
				}
			});
			
			var title = key.replace('-element', '');
			$('#schemaDialog').dialog('option', 'title', title);
			if (pos) $('#schemaDialog').dialog('option', 'position', [pos.x, pos.y]);
			$('#schemaDialog').dialog('open');
		},
		result: function() {
			var t = this;
			var entry = t.schema[t.currentKey];
			var params = {};
			$('#schemaDialog form input, #schemaDialog form select').each(function(index, el) {
				params[$(this).attr('name')] = $(this).val();
			});
			
			// validation
			var invalid = [];
			var i, att;
			for (i = 0; i < entry.attributes.length; i++) {
				att = entry.attributes[i];
				if (att.required && params[att.name] == '') {
					invalid.push(att.name);
				}
			}
			
			if (invalid.length > 0) {
				for (i = 0; i < invalid.length; i++) {
					var name = invalid[i];
					$('#schemaDialog input[name="'+name+'"]').css({borderColor: 'red'}).keyup(function(event) {
						$(this).css({borderColor: '#ccc'});
					});
				}
				return;
			}
			
			params['class'] = t.currentKey;
			params._tag = entry.elementName;
			params._schema = true;
			params._editable = true;
			
			switch (t.mode) {
				case t.ADD:
					t.editor.execCommand('addStructureTag', t.bm, params);
					break;
				case t.EDIT:
					t.editor.execCommand('editStructureTag', t.tag, params);
					t.tag = null;
			}
			
			$('#schemaDialog').dialog('close');
		},
		createControl: function(n, cm) {
			if (n == 'schematags') {
				var t = this;
				if (t.schema == null) {
					t.schema = cm.editor.execCommands.getSchema.func();//cm.editor.execCommand('getSchema');
				}
				var url = t.url+'/../../img/';
				t.menuButton = cm.createSplitButton('schemaTagsButton', {
					title: 'Schema Tags',
					image: url+'tag.png',
					'class': 'entityButton'
				});
				t.menuButton.onRenderMenu.add(function(c, m) {
//					var noAttsMenu = m.addMenu({
//						title: 'Simple Tags',
//						icon_src: url+'tag_blue.png'
//					});
//					var attsMenu = m.addMenu({
//						title: 'Complex Tags',
//						icon_src: url+'tag_blue_edit.png'
//					});
					for (var key in t.schema) {
						if (t.schema[key].attributes.length > 1) {
							m.add({
								title: key.replace('-element',''),
								key: key,
								icon_src: url + 'tag_blue_edit.png',
								onclick : function() {
									t.editor.execCommand('addSchemaTag', this.key);
								}
							});
						} else {
							m.add({
								title: key.replace('-element',''),
								key: key,
								icon_src: url + 'tag_blue.png',
								onclick : function() {
									t.editor.execCommand('addSchemaTag', this.key);
								}
							});
						}
					}
				});
				
				return t.menuButton;
			}
	
			return null;
		}
	});
	
	tinymce.PluginManager.add('schematags', tinymce.plugins.SchemaTags);
})(tinymce);