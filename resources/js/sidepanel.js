var SidePanel = function(config) {
	
	var w = config.writer;
	
	var sp = {};
	
	$(document.body).append(''+
		'<div id="entitiesMenu" class="contextMenu" style="display: none;"><ul>'+
		'<li id="editEntity"><ins style="background:url(img/tag_blue_edit.png) center center no-repeat;" />Edit Tag</li>'+
		'<li id="removeEntity"><ins style="background:url(img/cross.png) center center no-repeat;" />Remove Tag</li>'+
		'</ul></div>'
	);
	
	sp.updateEntitesList = function(sort) {
		if (sort == null) {
			if ($('#sequence').prop('checked')) {
				sort = 'sequence';
			} else {
				sort = 'category';
			}
		}
		
		$('#entities > ul').empty(); // remove previous nodes and event handlers
		
		var id, entry, i, infoKey, infoString;
		var entitiesString = '';
		
		if (sort == 'category') {
			var categories = {};
			for (id in w.entities) {
				entry = w.entities[id];
				if (categories[entry.props.type] == null) {
					categories[entry.props.type] = [];
				}
				categories[entry.props.type].push(entry);
			}
			var category;
			for (id in categories) {
				category = categories[id];
				for (i = 0; i < category.length; i++) {
					entry = category[i];
					infoString = '<ul>';
					for (infoKey in entry.info) {
						infoString += '<li><strong>'+infoKey+'</strong>: '+entry.info[infoKey]+'</li>';
					}
					infoString += '</ul>';
					entitiesString += '<li class="" name="'+entry.props.id+'">'+
						'<span class="'+entry.props.type+' box"/><span class="title">'+entry.props.title+'</span><div class="info">'+infoString+'</div>'+
					'</li>';
				}
			}
		} else if (sort == 'sequence') {
			var nodes = w.editor.dom.select('entity[class*="start"]');
			for (i = 0; i < nodes.length; i++) {
				id = nodes[i].getAttribute('name');
				entry = w.entities[id];
				infoString = '<ul>';
				for (infoKey in entry.info) {
					infoString += '<li><strong>'+infoKey+'</strong>: '+entry.info[infoKey]+'</li>'; 
				}
				infoString += '</ul>';
				entitiesString += '<li class="" name="'+entry.props.id+'">'+
					'<span class="'+entry.props.type+' box"/><span class="title">'+entry.props.title+'</span><div class="info">'+infoString+'</div>'+
				'</li>';
			}
		}
		
		$('#entities > ul').html(entitiesString);
		$('#entities > ul > li').hover(function() {
			if (!$(this).hasClass('selected')) {
				var color = $(this).find('span.box').css('backgroundColor');
				$(this).css('backgroundColor', color);
			}
		}, function() {
			if (!$(this).hasClass('selected')) {
				$(this).css('backgroundColor', '');
			}
		}).mousedown(function(event) {
			w.highlightEntity(this.getAttribute('name'), null, true);
		}).contextMenu('entitiesMenu', {
			bindings: {
				'editEntity': function(tag) {
					w.editTag($(tag).attr('name'));
				},
				'removeEntity': function(tag) {
					w.removeEntity($(tag).attr('name'));
				}
			},
			shadow: false,
			menuStyle: {
			    backgroundColor: '#FFFFFF',
			    border: '1px solid #D4D0C8',
			    boxShadow: '1px 1px 2px #CCCCCC',
			    padding: '0px'
			},
			itemStyle: {
				fontFamily: 'Tahoma,Verdana,Arial,Helvetica',
				fontSize: '11px',
				color: '#000',
				lineHeight: '20px',
				padding: '0px',
				cursor: 'pointer',
				textDecoration: 'none',
				border: 'none'
			},
			itemHoverStyle: {
				color: '#000',
				backgroundColor: '#DBECF3',
				border: 'none'
			}
		});
	};
	
	sp.removeFromEntitiesList = function(id) {
		$('#entities li[name="'+id+'"]').remove();
	};
	
	sp.toggleEntitiesList = function() {
		if ($('#main').css('marginLeft') == '6px') {
			$('#main').css('marginLeft', '250px');
			$('#tabs').show();
			$('#leftcol').width(250);
			$('#separator').addClass('arrowLeft').removeClass('arrowRight');
		} else {
			$('#main').css('marginLeft', '6px');
			$('#tabs').hide();
			$('#leftcol').width(6);
			$('#separator').addClass('arrowRight').removeClass('arrowLeft');
		}
	};
	
	sp.updateStructureTree = function(checkForNewTags) {
		w.highlightStructureTag(); // remove previous highlight
		
		var body = w.editor.dom.select('body');
//		$('#tree').jstree('_get_children').each(function(index, element) {
//			$('#tree').jstree('delete_node', $(this));
//		});
		$('#tree').jstree('delete_node', '#root');
		var root = $('#tree').jstree('create_node', $('#tree'), 'first', {
			data: 'Tags',
			attr: {id: 'root'},
			state: 'open'
		});
		_doStructureTreeUpdate($(body).children(), root, checkForNewTags);
	};
	
	var _doStructureTreeUpdate = function(children, nodeParent, checkForNewTags) {
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
						$(this).attr('id', id).attr('class', 'paraTag').attr('type', 'para');
						w.structs[id] = {
							id: id,
							lang: $(this).attr('lang'),
							'class': 'paraTag',
							type: 'para'
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
				var title = w.titles[info.type];
				newNodeParent = $('#tree').jstree('create_node', nodeParent, 'last', {
					data: title,
					attr: {name: id, 'class': $(this).attr('class')},
					state: isLeaf
				});
			}
			_doStructureTreeUpdate(newChildren, newNodeParent, checkForNewTags);
		});
	};
	
	return sp;
};