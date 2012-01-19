(function(tinymce) {

	// add block elements
	tinymce.html.Schema.blockElementsMap['DIV0'] = {};
	
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
			
			ed.addCommand('createSchemaTagsControl', function(config) {
				var url = t.url+'/../../img/';
				var menu = config.menu;
				
				menu.onShowMenu.add(function(m) {
					var filterKey = ed.currentNode.nodeName.toLowerCase();
					var validKeys = t.getFilteredSchema(filterKey);
					var item;
					for (var itemId in m.items) {
						item = m.items[itemId];
						item.setDisabled(!validKeys[item.settings.key]);
					}
				});
				
				for (var key in t.schema) {
					var icon = url + 'tag_blue.png';
					if (t.schema[key].attributes.length > 1) {
						icon = url + 'tag_blue_edit.png';
					}
					var menuitem = menu.add({
						title: t.schema[key].displayName,
						key: key,
						icon_src: icon,
						onclick : function() {
							t.editor.execCommand('addSchemaTag', this.key, config.pos);
						}
					});
					menuitem.setDisabled(config.disabled);
				}
				
				return menu;
			});
			
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
				
				t.mode = t.ADD;
				t.showDialog(key, pos);
			});
			
			ed.addCommand('editSchemaTag', function(tag, pos) {
				var key = tag.attr('_tag'); 
				t.currentKey = key;
				t.tag = tag;
				t.mode = t.EDIT;
				t.showDialog(key, pos);
			});
			
			$(document.body).append(''+
				'<div id="schemaDialog"><div class="content"></div></div>'+
				'<div id="schemaHelpDialog"></div>'
			);
			
			$('#schemaDialog').dialog({
				modal: true,
				resizable: false,
				dialogClass: 'splitButtons',
				closeOnEscape: false,
				open: function(event, ui) {
					$('#schemaDialog').parent().find('.ui-dialog-titlebar-close').hide();
				},
				height: 310,
				width: 435,
				autoOpen: false,
				buttons: [
					{
						text: 'Help',
						'class': 'left',
						click: function() {
							t.showHelpDialog();
						}
					},{
						text: 'Ok',
						click: function() {
							t.result();
						}
					},{
						text: 'Cancel',
						click: function() {
							t.editor.selection.moveToBookmark(t.bm);
							$('#schemaDialog').dialog('close');
							$('#schemaHelpDialog').dialog('close');
						}
					}
				]
			});
			
			$('#schemaHelpDialog').dialog({
				modal: false,
				resizable: false,
				autoOpen: false,
				height: 300,
				width: 300
			});
		},
		getFilteredSchema: function(filterKey) {
			var t = this;
			var validKeys = {};
			
			var getSubElements = function(key, validKeys) {
				var entry = t.schema[key];
				if (entry) {
//					var addedNew = false;
					var e;
					for (var i = 0; i < entry.elements.length; i++) {
						e = entry.elements[i].name;
						if (validKeys[e] == null) {
							validKeys[e] = true;
//							addedNew = true;
//							getSubElements(e, validKeys);
						}
					}
//					if (!addedNew) {
//						return;
//					}
				}
			};
			
			getSubElements(filterKey, validKeys);
			
			return validKeys;
		},
		showDialog: function(key, pos) {
			var t = this;
			t.currentKey = key;
			
			var entry = t.schema[key];
			var formString = '<form>';
			var attribute;
			
			$('#schemaDialog div.content').empty();
			
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
			
			$('#schemaDialog div.content').append(formString);
			
			$('#schemaDialog input').keyup(function(event) {
				if (event.keyCode == '13') {
					event.preventDefault();
					t.result();
				}
			});
			
			$('#schemaDialog').dialog('option', 'title', entry.displayName);
			if (pos) $('#schemaDialog').dialog('option', 'position', [pos.x, pos.y]);
			$('#schemaDialog').dialog('open');
		},
		showHelpDialog: function() {
			var key = this.schema[this.currentKey].displayName;
			$.ajax({
				url: this.editor.writer.baseUrl+'documentation/glossary_item_xml.php?KEY_VALUE_STR='+key,
				success: function(data, status, xhr) {
					if (typeof data == 'string') {
						data = $.parseJSON(data);
					}
					$('#schemaHelpDialog').empty();
					if (data.GLOSSITEM) {
						$('#schemaHelpDialog').dialog('option', 'title', key+' Help');
						
						var entryString = '';
						for (var glossKey in data.GLOSSITEM) {
							if (glossKey != 'GLOSSITEMTYPE' && glossKey != 'HEADING') {
								var entry = data.GLOSSITEM[glossKey];
								entryString += '<div><h2>'+entry.HEADING+'</h2>';
								for (var entryKey in entry) {
									if (entryKey != 'HEADING' && entryKey != 'DOCUMENTTYPE') {
										var subEntry = entry[entryKey];
										if (subEntry.P) subEntry = subEntry.P;
										subEntry = subEntry.replace(/</g, '&lt;').replace(/>/g, '&gt;');
										entryString += '<p>'+subEntry+'</p>';
									}
								}
							}
						}
						$('#schemaHelpDialog').append(entryString);
						
						var dialogOffset = $('#schemaDialog').offset();
						var x = dialogOffset.left + $('#schemaDialog').width() + 30;
						if (x > $(document).width()) {
							x = dialogOffset.left - 315;
						}
						var pos = [];
						pos[0] = x;
						pos[1] = dialogOffset.top - 31;
						$('#schemaHelpDialog').dialog('option', 'position', pos);
						$('#schemaHelpDialog').dialog('open');
					} else {
						$('#schemaHelpDialog').dialog('option', 'title', 'Help Error');
						$('#schemaHelpDialog').append('<p>There\'s no help available for '+key+'.</p>');
						$('#schemaHelpDialog').dialog('open');
					}
				},
				error: function(xhr, status, error) {
					$('#schemaHelpDialog').dialog('option', 'title', 'Help Error');
					$('#schemaHelpDialog p').html(status);
					$('#schemaHelpDialog').dialog('open');
				}
			});
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
			
			params._display = entry.displayName;
			params._tag = t.currentKey;
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
				
				t.schema = t.editor.execCommands.getSchema.func();//t.editor.execCommand('getSchema');
				
				var url = t.url+'/../../img/';
				t.menuButton = cm.createMenuButton('schemaTagsButton', {
					title: 'Tags',
					image: url+'tag.png',
					'class': 'entityButton'
				});
				t.menuButton.onRenderMenu.add(function(c, m) {
					t.editor.execCommand('createSchemaTagsControl', {menu: m, disabled: false});
				});
				
				return t.menuButton;
			}
	
			return null;
		}
	});
	
	tinymce.PluginManager.add('schematags', tinymce.plugins.SchemaTags);
})(tinymce);