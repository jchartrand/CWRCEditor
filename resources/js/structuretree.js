var StructureTree = function(config) {
	
	var w = config.writer;
	
	var tree = {};

	$(document.body).append('<div id="tree_popup"></div>');
	
	$('#tree').jstree({
		core: {},
		themeroller: {},
		ui: {
			select_limit: 1
		},
		json_data: {
			data: {
				data: 'Tags',
				attr: {id: 'root'},
				state: 'open'
			}
		},
		contextmenu: {
			select_node: true,
			show_at_node: false,
			items: function(node) {
				_hidePopup();
				if ($(node).attr('id') == 'root') return {};
				var info = w.structs[node.attr('name')];

				var validKeys = w.editor.execCommand('getFilteredSchema', {filterKey: info._tag, type: 'element', returnType: 'object'});
				var inserts = {};
				for (var key in validKeys) {
					var doc = key;
					if (validKeys[key].def['a:documentation']) {
						doc = validKeys[key].def['a:documentation']['#text'] || validKeys[key].def['a:documentation'];
					}
					inserts[key] = {
						label: '<span title="'+doc+'">'+key+'</span>',
						icon: 'img/tag_blue.png',
						action: function(obj) {
							var key = obj.text();
							var pos = {
								x: parseInt($('#tree_popup').css('left')),
								y: parseInt($('#tree_popup').css('top'))
							};
							w.editor.currentBookmark = w.editor.selection.getBookmark(1);
							w.editor.execCommand('addSchemaTag', key, pos);
						}
					};
				}

				var items = {
					'insert': {
						label: 'Insert Tag',
						icon: 'img/tag_blue_add.png',
						_class: 'submenu',
						submenu: inserts
					},
					'edit': {
						label: 'Edit Tag',
						icon: 'img/tag_blue_edit.png',
						action: function(obj) {
							var pos = {
								x: parseInt($('#tree_popup').css('left')),
								y: parseInt($('#tree_popup').css('top'))
							};
							w.editor.execCommand('editTag', obj.attr('name'), pos);
						}
					},
					'delete': {
						label: 'Remove Tag',
						icon: 'img/cross.png',
						action: function(obj) {
							w.removeStructureTag(obj.attr('name'));
						}
					}
				};
				if (info._editable == false) {
					delete items.edit;
				} else if (info._tag == 'p') {
					delete items['delete'];
				}
				return items;
			}
		},
		hotkeys: {
			del: function(e) {
				if (this.is_selected()) {
					var node = this.get_selected();
					var id = node.attr('name');
					if (id) {
						w.removeStructureTag(id);
					}
				}
			},
			f2: false
		},
		plugins: ['json_data', 'ui', 'themeroller', 'contextmenu', 'hotkeys']
	});
	$('#tree').mousemove(function(e) {
		$('#tree_popup').offset({left: e.pageX+15, top: e.pageY+5});
	});
	$('#tree').bind('select_node.jstree', function(event, data) {
		var node = data.rslt.obj;
		var id = node.attr('name');
		if (id) w.selectStructureTag(id);
	});
	$('#tree').bind('hover_node.jstree', function(event, data) {
		if ($('#vakata-contextmenu').css('visibility') == 'visible') return;
		
		var node = data.rslt.obj;
		
		if (node.attr('id') == 'root') return;
		
		var id = node.attr('name');
		var info = w.structs[id];
		var content = '<ul>';
		for (var key in info) {
			if (key.indexOf('_') != 0) {
				content += '<li>'+key+': '+info[key]+'</li>';
			}
		}
		content += '</ul>';
		_showPopup(content);
	});
	$('#tree').bind('dehover_node.jstree', function(event, data) {
		_hidePopup();
	});

	tree.update = function() {
		var body = w.editor.dom.select('body');
	//	$('#tree').jstree('_get_children').each(function(index, element) {
	//		$('#tree').jstree('delete_node', $(this));
	//	});
		$('#tree').jstree('delete_node', '#root');
		var root = $('#tree').jstree('create_node', $('#tree'), 'first', {
			data: 'Tags',
			attr: {id: 'root'},
			state: 'open'
		});
		_doUpdate($(body).children(), root);
	};

	var _doUpdate = function(children, nodeParent) {
		children.each(function(index, el) {
			var newChildren = $(this).children();
			var newNodeParent = nodeParent;
			if ($(this).attr('_struct') || $(this).is(w.root)) {
				var id = $(this).attr('id');
				var isLeaf = $(this).find('[_struct]').length > 0 ? 'open' : null;
				
				// new struct check
				if (id == '' || id == null) {
					id = tinymce.DOM.uniqueId('struct_');
					var tag = $(this).attr('_tag');
					if (tag == null && $(this).is(w.root)) tag = w.root;
					var entry = w.schema.define[tag];
					if (entry) {
						var display = tag;
						$(this).attr('id', id).attr('_tag', tag).attr('_struct', true);
						w.structs[id] = {
							id: id,
							_tag: tag
						};
					}
				// redo/undo re-added a struct check
				} else if (w.structs[id] == null) {
					w.structs[id] = {};
					var att;
					for (var i = 0; i < this.attributes.length; i++) {
						att = this.attributes.item(i);
						w.structs[id][att.name] = att.value;
					}
				// duplicate struct check
				} else {
					var match = w.editor.$('[id='+id+']');
					if (match.length > 1) {
						match.each(function(index, el) {
							if (index > 0) {
								var newStruct = $(el);
								var newId = tinymce.DOM.uniqueId('struct_');
								newStruct.attr('id', newId);
								w.structs[newId] = {};
								for (var key in w.structs[id]) {
									w.structs[newId][key] = w.structs[id][key];
								}
								w.structs[newId].id = newId;
							}
						});
					}
				}
				
				var info = w.structs[id];
				if (info) {
					var title = info._tag;
					newNodeParent = $('#tree').jstree('create_node', nodeParent, 'last', {
						data: title,
						attr: {name: id, 'class': $(this).attr('class')},
						state: isLeaf
					});
				}
			}
			_doUpdate(newChildren, newNodeParent);
		});
	};
	
	
	var _showPopup = function(content) {
		$('#tree_popup').html(content).show();
	};
	
	var _hidePopup = function() {
		$('#tree_popup').hide();
	};
	
	return tree;
};