var StructureTree = function(config) {
	
	var w = config.writer;
	
	var tree = {};

	$(config.parentId).append('<div id="structure"><div id="tree"></div></div>');
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
				if (node.attr('id') == 'root') return {};
				
				var parentNode = node.parents('li:first');
				
				var info = w.structs[node.attr('name')];

				if (info._tag == 'teiHeader') return {};
				
				var parentInfo = w.structs[parentNode.attr('name')];
				
				var validKeys = w.editor.execCommand('getChildrenForTag', {tag: info._tag, type: 'element', returnType: 'object'});
				var parentKeys = {};
				if (parentInfo) {
					parentKeys = w.editor.execCommand('getChildrenForTag', {tag: parentInfo._tag, type: 'element', returnType: 'object'});
				}
				
				function getSubmenu(keys) {
					var inserts = {};
					var inserted = false;
					for (var key in keys) {
						inserted = true;
						var doc = $('a\\:documentation, documentation', keys[key].element).first();
						if (doc.length == 1) {
							doc = doc.text();
						} else {
							doc = key;
						}
						inserts[key] = {
							label: '<span title="'+doc+'">'+key+'</span>',
							icon: 'img/tag_blue.png',
							action: function(obj) {
								var actionType = obj.parents('li.submenu').children('a').attr('rel');
								var key = obj.text();
								var pos = {
									x: parseInt($('#tree_popup').css('left')),
									y: parseInt($('#tree_popup').css('top'))
								};
								if (actionType == 'change') {
									var id = $('#tree a.ui-state-active').closest('li').attr('name');
									w.editor.execCommand('changeTag', {key: key, pos: pos, id: id});
								} else {
									w.editor.currentBookmark = w.editor.selection.getBookmark(1);
									w.editor.execCommand('addSchemaTag', {key: key, pos: pos, action: actionType});
								}
							}
						};
					}
					if (!inserted) {
						inserts['no_tags'] = {
							label: 'No tags available.',
							icon: 'img/cross.png',
							action: function(obj) {}
						};
					}
					return inserts;
				}
				
				var submenu = getSubmenu(validKeys);
				var parentSubmenu = getSubmenu(parentKeys);
				

				var items = {
					'before': {
						label: 'Insert Tag Before',
						icon: 'img/tag_blue_add.png',
						_class: 'submenu',
						submenu: parentSubmenu
					},
					'after': {
						label: 'Insert Tag After',
						icon: 'img/tag_blue_add.png',
						_class: 'submenu',
						submenu: parentSubmenu
					},
					'around': {
						label: 'Insert Tag Around',
						icon: 'img/tag_blue_add.png',
						_class: 'submenu',
						submenu: parentSubmenu
					},
					'inside': {
						label: 'Insert Tag Inside',
						icon: 'img/tag_blue_add.png',
						_class: 'submenu',
						separator_after: true,
						submenu: submenu
					},
					'change': {
						label: 'Change Tag',
						icon: 'img/tag_blue_edit.png',
						_class: 'submenu',
						submenu: parentSubmenu
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
						icon: 'img/tag_blue_delete.png',
						action: function(obj) {
							w.removeStructureTag(obj.attr('name'));
						}
					}
				};
				if (info._tag == w.root) {
					delete items['delete'];
					delete items['before'];
					delete items['after'];
					delete items['around'];
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
		if (id) {
			if (w.structs[id]._tag == 'teiHeader') {
				w.d.show('teiheader');
			} else {
				w.selectStructureTag(id);
			}
		}
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
					if (w.schema.elements.indexOf(tag) != -1) {
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