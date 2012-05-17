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
			
			t.isDirty = false;
			
			t.schema = null;
			
			t.tag = null;
			
			t.bm = null;
			
			ed.addCommand('createSchemaTagsControl', function(config) {
				var url = t.url+'/../../img/';
				var menu = config.menu;
				
				menu.beforeShowMenu.add(function(m) {
					var filterKey = ed.currentNode.getAttribute('_tag');
					var validKeys = t.editor.execCommand('getFilteredSchema', {filterKey: filterKey, type: 'element', returnType: 'object'});
					var item;
					var count = 0, disCount = 0;
					for (var itemId in m.items) {
						count++;
						item = m.items[itemId];
						if (validKeys[item.settings.key]) {
							item.setDisabled(false);
						} else {
							item.setDisabled(true);
							disCount++;
						}
					}
					if (count == disCount) {
						m.items['no_tags'].setDisabled(false);
					}
				});
				
				for (var i = 0; i < t.schema.elements.length; i++) {
					var key = t.schema.elements[i];
					var menuitem = menu.add({
						title: key,
						key: key,
						icon_src: url + 'tag_blue.png',
						onclick : function() {
							t.editor.execCommand('addSchemaTag', this.key, config.pos);
						}
					});
					menuitem.setDisabled(config.disabled);
				}
				var menuitem = menu.add({
					title: 'No tags available for current parent tag.',
					id: 'no_tags',
					icon_src: url + 'cross.png',
					onclick : function() {}
				});
				menuitem.setDisabled(true);
				
				return menu;
			});
			
			ed.addCommand('addSchemaTag', function(key, pos) {
				t.editor.selection.moveToBookmark(t.editor.currentBookmark);
				t.editor.currentBookmark = null;
				
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
				resizable: true,
				dialogClass: 'splitButtons',
				closeOnEscape: false,
				open: function(event, ui) {
					$('#schemaDialog').parent().find('.ui-dialog-titlebar-close').hide();
				},
				height: 460,
				width: 500,
				autoOpen: false,
				buttons: [
					{
						text: 'Help',
						'class': 'left',
						click: function() {
							t.showHelpDialog();
						}
					},{
						id: 'schemaOkButton',
						text: 'Ok',
						click: function() {
							t.result();
						}
					},{
						text: 'Cancel',
						click: function() {
							t.cancel();
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
		showDialog: function(key, pos) {
			var t = this;
			t.currentKey = key;
			
			t.isDirty = false;
			
			$('#schemaDialog div.content').empty();
			
			var atts = t.editor.execCommand('getFilteredSchema', {filterKey: key, type: 'attribute', returnType: 'array'});
			
			// build atts
			var level1Atts = '<div id="level1Atts">';
			var highLevelAtts = '<div id="highLevelAtts">';
			var attributeSelector = '<div id="attributeSelector"><h2>Attributes</h2><ul>';
			var att, currAttString, attDef;
			var isLevel1 = false;
			var required = false;
			for (var i = 0; i < atts.length; i++) {
				att = atts[i];
				currAttString = '';
				required = !att.optional;
				if (att.level == 1 || required) {
					isLevel1 = true; // required attributes should be displayed by default
				} else {
					isLevel1 = false;
				}
				attDef = att.def;
				var attName = attDef['-name'];
				var doc = '';
				if (attDef['a:documentation']) {
					var text = attDef['a:documentation']['#text'] || attDef['a:documentation'];
					doc = 'title="'+text+'"';
				}
				if (attName != 'id') {
					var display = 'block';
					var requiredClass = required ? ' required' : '';
					if (isLevel1 || t.mode == t.EDIT && $(t.tag).attr(attName) != undefined) {
						display = 'block';
						attributeSelector += '<li id="select_'+attName+'" class="selected'+requiredClass+'" '+doc+'>'+attName+'</li>';
					} else {
						display = 'none';
						attributeSelector += '<li id="select_'+attName+'" '+doc+'>'+attName+'</li>';
					}
					currAttString += '<div id="form_'+attName+'" style="display:'+display+';" '+doc+'><label>'+attName+'</label>';
					
					var defaultVal = attDef['-a:defaultValue'] == undefined ? '' : attDef['-a:defaultValue'];
					if (t.mode == t.EDIT) defaultVal = $(t.tag).attr(attName) || '';
					if (attDef.list) {
						currAttString += '<input type="text" name="'+attName+'" value="'+defaultVal+'"/>';
					} else if (attDef.choice && attDef.choice.value) {
						currAttString += '<select name="'+attName+'">';
						var attVal, selected;
						for (var j = 0; j < attDef.choice.value.length; j++) {
							attVal = attDef.choice.value[j];
							selected = defaultVal == attVal ? ' selected="selected"' : '';
							currAttString += '<option value="'+attVal+'"'+selected+'>'+attVal+'</option>';
						}
						currAttString += '</select>';
					} else if (attDef.ref) {
						currAttString += '<input type="text" name="'+attName+'" value="'+defaultVal+'"/>';
					} else {
						currAttString += '<input type="text" name="'+attName+'" value="'+defaultVal+'"/>';
					}
					if (required) currAttString += ' <span class="required">*</span>';
					currAttString += '</div>';
					
					if (isLevel1) {
						level1Atts += currAttString;
					} else {
						highLevelAtts += currAttString;
					}
				}
			}
			
			level1Atts += '</div>';
			highLevelAtts += '</div>';
			attributeSelector += '</ul></div>';
			
			$('#schemaDialog div.content').append(attributeSelector + '<div id="attsContainer">'+level1Atts + highLevelAtts+'</div>');
			
			$('#attributeSelector li').click(function() {
				if ($(this).hasClass('required')) return;
				
				var name = $(this).attr('id').split('select_')[1].replace(/:/g, '\\:');
				var div = $('#form_'+name);
				$(this).toggleClass('selected');
				if ($(this).hasClass('selected')) {
					div.show();
				} else {
					div.hide();
				}
			});
			
			$('#schemaDialog .info').hover(function(event) {
				var offset = $(this).offset();
				$(this).toggleClass('hover ui-corner-all ui-state-highlight');
				$(this).offset(offset);
			}, function(event) {
				$(this).toggleClass('hover ui-corner-all ui-state-highlight');
			});
			
			$('#schemaDialog input, #schemaDialog select, #schemaDialog option').change(function(event) {
				t.isDirty = true;
			});
			$('#schemaDialog select, #schemaDialog option').click(function(event) {
				t.isDirty = true;
			});
			
			$('#schemaDialog input, #schemaDialog select, #schemaDialog option').keyup(function(event) {
				if (event.keyCode == '13') {
					event.preventDefault();
					if (t.isDirty) t.result();
					else t.cancel(); 
				}
			});
			
			$('#schemaDialog').dialog('option', 'title', key);
			if (pos) $('#schemaDialog').dialog('option', 'position', [pos.x, pos.y]);
			$('#schemaDialog').dialog('open');
			
			// focus on the ok button if there are no inputs
			$('#schemaOkButton').focus();
			$('#schemaDialog input, #schemaDialog select').first().focus();
		},
		showHelpDialog: function() {
			var key = this.currentKey;
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
			var params = {};
			$('#attsContainer > div > div:visible').children('input, select').each(function(index, el) {
				params[$(this).attr('name')] = $(this).val();
			});
			
			// validation
			var invalid = [];
			$('#attsContainer span.required').parent().children('label').each(function(index, el) {
				if (params[$(this).text()] == '') {
					invalid.push($(this).text());
				}
			});
			if (invalid.length > 0) {
				for (var i = 0; i < invalid.length; i++) {
					var name = invalid[i];
					$('#attsContainer *[name="'+name+'"]').css({borderColor: 'red'}).keyup(function(event) {
						$(this).css({borderColor: '#ccc'});
					});
				}
				return;
			}
			
			params._tag = t.currentKey;
			params._struct = true;
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
		cancel: function() {
			var t = this;
			t.editor.selection.moveToBookmark(t.bm);
			$('#schemaDialog').dialog('close');
			$('#schemaHelpDialog').dialog('close');
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
				}, tinymce.ui.ScrollingMenuButton);
				t.menuButton.beforeShowMenu.add(function(c) {
					t.editor.currentBookmark = t.editor.selection.getBookmark();
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