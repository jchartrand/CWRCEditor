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
				var items = {
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
				} else if (info._tag == 'para') {
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
		w.highlightStructureTag(id);
	});
	$('#tree').bind('hover_node.jstree', function(event, data) {
		if ($('#vakata-contextmenu').css('visibility') == 'visible') return;
		
		var node = data.rslt.obj;
		
		if (node.attr('id') == 'root') return;
		
		var id = node.attr('name');
		var info = w.structs[id];
		var content = '<ul>';
		for (var key in info) {
			content += '<li>'+key+': '+info[key]+'</li>';
		}
		content += '</ul>';
		_showPopup(content);
	});
	$('#tree').bind('dehover_node.jstree', function(event, data) {
		_hidePopup();
	});

	tree.update = function(checkForNewTags) {
		w.highlightStructureTag(); // remove previous highlight
		
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
		_doUpdate($(body).children(), root, checkForNewTags);
	};

	var _doUpdate = function(children, nodeParent, checkForNewTags) {
		children.each(function(index, el) {
			var newChildren = $(this).children();
			var newNodeParent = nodeParent;
			if ($(this).is('struct') || $(this).is('p')) {
				var id = $(this).attr('id');
				var isLeaf = $(this).find('struct, p').length > 0 ? 'open' : null;
				
				if (checkForNewTags) {
					// new paragraph check
					if (id == '' || id == null && $(this).is('p')) {
						id = tinymce.DOM.uniqueId('struct_');
						$(this).attr('id', id).attr('class', 'paraTag').attr('_tag', 'para');
						w.structs[id] = {
							id: id,
							lang: $(this).attr('lang'),
							'class': 'paraTag',
							_tag: 'para'
						};
					// duplicate struct check
					} else {
						var match = w.editor.$('struct[id='+id+']');
						if (match.length == 2) {
							var newStruct = match.last();
							var newId = tinymce.DOM.uniqueId('struct_');
							newStruct.attr('id', newId);
							w.structs[newId] = {};
							for (var key in w.structs[id]) {
								w.structs[newId][key] = w.structs[id][key];
							}
							w.structs[newId].id = newId;
						}
					}
				}
				
				var info = w.structs[id];
				var title = w.titles[info._tag] || info._tag;
				newNodeParent = $('#tree').jstree('create_node', nodeParent, 'last', {
					data: title,
					attr: {name: id, 'class': $(this).attr('class')},
					state: isLeaf
				});
			}
			_doUpdate(newChildren, newNodeParent, checkForNewTags);
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