$(function() {
	var editor = null; // reference to the tinyMCE instance we're creating, set in setup
	
	var entities = {}; // entities store
	
	var structs = {}; // structs store
	
	// tag types and their titles
	var titles = {
		person: 'Person',
		date: 'Date',
		place: 'Place',
		event: 'Event',
		org: 'Organization',
		bibref: 'Bib. Ref.',
		note: 'Note',
		para: 'Paragraph',
		head: 'Heading',
		emph: 'Emphasized',
		title: 'Title',
		quote: 'Quotation'
	};
	
	// possible results when trying to add entity
	var NO_SELECTION = 0;
	var NO_COMMON_PARENT = 1;
	var VALID = 2;
	
	var dialog = new Dialog();
	dialog.init();
	$('#dialogEvents').bind('searchResult', function(e, type, info) {
		finalizeEntity(editor.currentEntity, info);
	}).bind('noteResult', function(e, type, info) {
		finalizeEntity(editor.currentEntity, info);
	}).bind('dateResult', function(e, type, info) {
		finalizeEntity(editor.currentEntity, info);
	});
	
	var cssLocation = 'css/editor.css';
//	if ($.browser.msie) {
//		cssLocation = 'css/editor_ie.css';
//	}
	
	var editor_oninit = function(ed) {
		ed.addCommand('showError', showError);
		ed.addCommand('addEntity', addEntity);
		ed.addCommand('removeEntity', removeEntity);
		ed.addCommand('addStructureTag', addStructureTag);
		ed.addCommand('editStructureTag', editStructureTag);
		ed.addCommand('updateStructureTree', updateStructureTree);
		ed.addCommand('removeHighlights', removeHighlights);
		
		// highlight tracking
		ed.onMouseUp.add(doHighlightCheck);
		
		ed.onKeyUp.add(function(ed, evt) {
			// nav keys check
			if (evt.keyCode >= 33 || evt.keyCode <= 40) {
				doHighlightCheck(ed, evt);
			}
			
			// update current entity
			if (ed.currentEntity) {
				var content = ed.$('#entityHighlight').text();
				var entity = entities[ed.currentEntity];
				entity.content = content;
				entity.title = getTitleFromContent(content);
				$('#entities li[name="'+ed.currentEntity+'"] > span[class="title"]').html(entity.title);
			}
			
			// delete keys check
//			if (evt.keyCode == 8 || evt.keyCode == 46) {
//				var key;
//				for (key in entities) {
//					var nodes = editor.dom.select('entity[name="'+key+'"]');
//					switch (nodes.length) {
//						case 0:
//							delete entities[key];
//							removeFromEntitiesList(key);
//							break;
//						case 1:
//							editor.dom.remove(nodes[0]);
//							delete entities[key];
//							removeFromEntitiesList(key);
//					}
//				}
//				for (key in structs) {
//					var struct = editor.dom.get('#'+key);
//					if (!struct) {
//						updateStructureTree();
//						break;
//					}
//				}
//			}
//			
//			// enter key check
//			if (evt.keyCode == 13) {
//				updateStructureTree();
//			}
		});
		
		doResize();
	};
	
	var onChangeHandler = function(ed) {
		if (ed.isDirty()) {
			updateStructureTree();
			
			for (var key in entities) {
				var nodes = editor.dom.select('entity[name="'+key+'"]');
				switch (nodes.length) {
					case 0:
						delete entities[key];
						removeFromEntitiesList(key);
						break;
					case 1:
						editor.dom.remove(nodes[0]);
						delete entities[key];
						removeFromEntitiesList(key);
				}
			}
		}
	};
	
	var doHighlightCheck = function(ed, evt) {		
		highlightStructureTag();
		
		var range = ed.selection.getRng(true);
		
		var entityStart = findEntityBoundary('start', range.startContainer, null, [range.startContainer.parentNode]);
		var entityEnd = findEntityBoundary('end', range.endContainer, null, [range.endContainer.parentNode]);
		
		if (entityEnd == null || entityStart == null) {
			highlightEntity();
			return;
		}
		
		var startKey = entityStart.getAttribute('name');
		var endKey = entityEnd.getAttribute('name');
		
		// priority goes to startKey if they aren't the same
		if (startKey == ed.currentEntity) return;
		
		var bm = ed.selection.getBookmark();
		highlightEntity(startKey, bm);
	};
	
	/**
	 * Searches for an entity boundary containing the current node.
	 * @param boundaryType Either 'start' or 'end'.
	 * @param currentNode The node that is currently being examined.
	 * @param currentKey The key of an entity that is also contained within the entity we're looking for.  Used to prevent false positives.
	 * @param levels An array to track the levels of node depth in order to prevent endless recursion.
	 */
	var findEntityBoundary = function(boundaryType, currentNode, currentKey, levels) {
		if (editor.dom.hasClass(currentNode, 'entity')) {
			if (editor.dom.hasClass(currentNode, boundaryType)) {
				if (currentKey == null || currentKey != currentNode.getAttribute('name')) {
					return currentNode;
				} else if (currentKey == currentNode.getAttribute('name')) {
					currentKey = null;
				}
			} else {
				currentKey = currentNode.getAttribute('name');
			}
		}
		
		if (boundaryType == 'start' && currentNode.lastChild) {
			levels.push(currentNode);
			return findEntityBoundary(boundaryType, currentNode.lastChild, currentKey, levels);
		} else if (boundaryType == 'end' && currentNode.firstChild) {
			levels.push(currentNode);
			return findEntityBoundary(boundaryType, currentNode.firstChild, currentKey, levels);
		}
		
		if (boundaryType == 'start' && currentNode.previousSibling) {
			return findEntityBoundary(boundaryType, currentNode.previousSibling, currentKey, levels);
		} else if (boundaryType == 'end' && currentNode.nextSibling) {
			return findEntityBoundary(boundaryType, currentNode.nextSibling, currentKey, levels);
		}
		
		if (currentNode.parentNode) {
			if (currentNode.parentNode == levels[levels.length-1]) {
				levels.pop();
				if (boundaryType == 'start' && currentNode.parentNode.previousSibling) {
					return findEntityBoundary(boundaryType, currentNode.parentNode.previousSibling, currentKey, levels);
				} else if (boundaryType == 'end' && currentNode.parentNode.nextSibling) {
					return findEntityBoundary(boundaryType, currentNode.parentNode.nextSibling, currentKey, levels);
				} else return null;
			} else {
				return findEntityBoundary(boundaryType, currentNode.parentNode, currentKey, levels);
			}
		}
		
		return null;
	};
	
	var highlightEntity = function(key, bm, doScroll) {
		editor.currentEntity = null;
		
		var prevHighlight = editor.$('#entityHighlight');
		if (prevHighlight.length == 1) {
			var children = prevHighlight[0].childNodes;
			editor.$(children).unwrap();
			prevHighlight.remove();
			
			$('#entities > ul > li').each(function(index, el) {
				$(this).removeClass('selected').css('background-color', '').find('div[class="info"]').hide();
			});
		}
		
		if (key) {
			editor.currentEntity = key;
			var type = entities[key].type;
			var markers = editor.dom.select('entity[name="'+key+'"]');
			var start = markers[0];
			var end = markers[1];
			var typeColor = editor.$(start).css('border-left-color');
			
			var nodes = [start];
			var currentNode = start;
			while (currentNode != end) {
				currentNode = currentNode.nextSibling;
				nodes.push(currentNode);
			}
			
			editor.$(nodes).wrapAll('<span id="entityHighlight" />');
			editor.$('#entityHighlight').css({
				'background-color': typeColor,
                'border-radius': '5px',
                'color': '#fff'
			});
			
			// maintain the original caret position
			if (bm) {
				editor.selection.moveToBookmark(bm);
			}
			
			if (doScroll) {
				var val = editor.$(start).offset().top;
				editor.$(editor.dom.doc.body).scrollTop(val);
			}
			
			$('#entities > ul > li[name="'+key+'"]').addClass('selected').css('background-color', typeColor).find('div[class="info"]').show();
		}
	};
	
	// checks the user selection and potential entity markers
	var isEntityValid = function() {
		var sel = editor.selection;
		if (sel.isCollapsed()) return NO_SELECTION;
		if (sel.getContent() == '') return NO_SELECTION;
		
		// check for overlap potential
		var range = sel.getRng(true);
		if (range.startContainer.parentNode != range.endContainer.parentNode) return NO_COMMON_PARENT;
		
		return VALID;
	};
	
	var showError = function(errorType) {
		switch(errorType) {
		case NO_SELECTION:
			dialog.showMessage({
				title: 'Error',
				msg: 'Please select some text before adding an entity.'
			});
			break;
		case NO_COMMON_PARENT:
			dialog.showMessage({
				title: 'Error',
				msg: 'Please ensure that the beginning and end of your selection have a common parent.<br/>For example, your selection cannot begin in one paragraph and end in another, or begin in bolded text and end outside of that text.'
			});
		}
	};
	
	var addEntity = function(type) {
		var result = isEntityValid();
		if (result == VALID) {
			editor.currentEntity = addEntityTag(type);
			var title = titles[type];
			if (type == 'note' || type == 'bibref') {
				dialog.showNote({type: type, title: title, pos: getPos()});
			} else if (type == 'date') {
				dialog.showDate({type: type, title: title, pos: getPos()});
			} else {
				var query = entities[editor.currentEntity].content;
				dialog.showSearch({type: type, title: title, query: query, pos: getPos()});
			}
		} else {
			showError(result);
		}
	};
	
	var addEntityTag = function(type) {
		var sel = editor.selection;
		var content = sel.getContent();
		var range = sel.getRng(true);
		
		// strip tags
		content = content.replace(/<\/?[^>]+>/gi, '');
		
		// trim whitespace
		var leftTrimAmount = content.match(/^\s{0,1}/)[0].length;
		var rightTrimAmount = content.match(/\s{0,1}$/)[0].length;
		range.setStart(range.startContainer, range.startOffset+leftTrimAmount);
		range.setEnd(range.endContainer, range.endOffset-rightTrimAmount);
		sel.setRng(range);
		content = content.replace(/^\s+|\s+$/g, '');
		
		var title = getTitleFromContent(content);
		
		var key = tinymce.DOM.uniqueId('ent_');
		
		entities[key] = {
			key: key,
			type: type,
			title: title,
			content: content
		};
		
		var bm = editor.selection.getBookmark();
		
		var start = editor.dom.create('entity', {'class': 'entity '+type+' start', 'name': key});
		range.insertNode(start);
		editor.dom.bind(start, 'click', doMarkerClick);
		
		editor.selection.moveToBookmark(bm);
		
		var end = editor.dom.create('entity', {'class': 'entity '+type+' end', 'name': key});
		sel.collapse(false);
		range = sel.getRng(true);
		range.insertNode(end);
		editor.dom.bind(end, 'click', doMarkerClick);
		
		return key;
	};
	
	var finalizeEntity = function(key, info) {
		if (info == null) {
			removeEntity(key);
		} else {
			entities[key].info = info;
			updateEntitesList();
			highlightEntity(key);
		}
	};
	
	var removeEntity = function(key) {
		key = key || editor.currentEntity;
		
		delete entities[key];
		
		editor.dom.remove(editor.dom.select('entity[name="'+key+'"]'));
		
		highlightEntity();
		
		removeFromEntitiesList(key);
	};
	
	var updateEntitesList = function(sort) {
		if (sort == null) {
			if ($('#sequence').prop('checked')) {
				sort = 'sequence';
			} else {
				sort = 'category';
			}
		}
		
		$('#entities > ul').empty(); // remove previous nodes and event handlers
		
		var key, entry, i, infoKey, infoString;
		var entitiesString = '';
		
		if (sort == 'category') {
			var categories = {};
			for (key in entities) {
				entry = entities[key];
				if (categories[entry.type] == null) {
					categories[entry.type] = [];
				}
				categories[entry.type].push(entry);
			}
			var category;
			for (key in categories) {
				category = categories[key];
				for (i = 0; i < category.length; i++) {
					entry = category[i];
					infoString = '<ul>';
					for (infoKey in entry.info) {
						infoString += '<li><strong>'+infoKey+'</strong>: '+entry.info[infoKey]+'</li>';
					}
					infoString += '</ul>';
					entitiesString += '<li class="" name="'+entry.key+'">'+
						'<span class="'+entry.type+' box"/><span class="title">'+entry.title+'</span><div class="info">'+infoString+'</div>'+
					'</li>';
				}
			}
		} else if (sort == 'sequence') {
			var nodes = editor.dom.select('entity[class*="start"]');
			for (i = 0; i < nodes.length; i++) {
				key = nodes[i].getAttribute('name');
				entry = entities[key];
				infoString = '<ul>';
				for (infoKey in entry.info) {
					infoString += '<li><strong>'+infoKey+'</strong>: '+entry.info[infoKey]+'</li>'; 
				}
				infoString += '</ul>';
				entitiesString += '<li class="" name="'+entry.key+'">'+
					'<span class="'+entry.type+' box"/><span class="title">'+entry.title+'</span><div class="info">'+infoString+'</div>'+
				'</li>';
			}
		}
		
		$('#entities > ul').html(entitiesString);
		$('#entities > ul > li').click(function() {
			var key = this.getAttribute('name');
			highlightEntity(key, null, true);
		});
	};
	
	var removeFromEntitiesList = function(key) {
		$('#entities li[name="'+key+'"]').remove();
	};
	
	var toggleEntitiesList = function() {
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
	
	var getTitleFromContent = function(content) {
		if (content.length <= 34) return content;
		var title = content.substring(0, 34) + '&#8230;';
		return title;
	};
	
	var getPos = function() {
		var pos = null;
		if (editor.contextMenuPos != null) {
			var editorPos = $(editor.contentAreaContainer).offset();
			pos = {
				x: editor.contextMenuPos.x + editorPos.left,
				y: editor.contextMenuPos.y + editorPos.top
			};
		}
		return pos;
	};
	
	// prevents the user from moving the caret inside a marker
	var doMarkerClick = function(e) {
		var marker = editor.dom.get(e.target);
		var range = editor.selection.getRng(true);
		if (editor.dom.hasClass(marker, 'start')) {
			range.setStartAfter(marker);
			range.setEndAfter(marker);
		} else {
			range.setStartBefore(marker);
			range.setEndBefore(marker);
		}
		editor.selection.setRng(range);
		highlightEntity(marker.getAttribute('name'), editor.selection.getBookmark());
	};
	
	var doResize = function() {
		var newHeight = $(window).height() - 30;
		$('#leftcol > div').height(newHeight);
		$('#'+editor.id+'_ifr').height(newHeight - 49);
	};
	
	var showPopup = function(pos, content) {
		$('#popup').html(content).show().offset(pos);
	};
	
	var hidePopup = function() {
		$('#popup').hide();
	};
	
	var addStructureTag = function(bookmark, attributes) {
		var id = tinymce.DOM.uniqueId('struct_');
		attributes.id = id;
		structs[id] = attributes;
		
		var tag, open_tag, close_tag;
		tag = 'struct';
		if (attributes.type == 'para') {
			tag = 'p';
		}
		editor.selection.moveToBookmark(bookmark);
		var selection = editor.selection.getContent();
		open_tag = '<'+tag;
		for (var key in attributes) {
			open_tag += ' '+key+'="'+attributes[key]+'"';
		}
		open_tag += '>';
		close_tag = '</'+tag+'>';
		var content = open_tag + selection + close_tag;
		editor.execCommand('mceReplaceContent', false, content);
	};
	
	var editStructureTag = function(tag, attributes) {
		var id = tag.attr('id');
		for (var key in attributes) {
			tag.attr(key, attributes[key]);
		}
		structs[id] = attributes;
		updateStructureTree();
	};
	
	var removeStructureTag = function(id) {
		var tag = editor.$('#'+id)[0];
		var children = tag.childNodes;
		editor.$(children).unwrap();
		updateStructureTree();
	};
	
	var updateStructureTree = function() {
		highlightStructureTag(); // remove previous highlight
		
		var body = editor.dom.select('body');
//		$('#tree').jstree('_get_children').each(function(index, element) {
//			$('#tree').jstree('delete_node', $(this));
//		});
		$('#tree').jstree('delete_node', '#root');
		var root = $('#tree').jstree('create_node', $('#tree'), 'first', {
			data: 'Tags',
			attr: {id: 'root'},
			state: 'open'
		});
		doStructureTreeUpdate($(body).children(), root);
	};
	
	var doStructureTreeUpdate = function(children, nodeParent) {
		children.each(function(index, el) {
			var newChildren = $(this).children();
			var newNodeParent = nodeParent;
			if ($(this).is('struct') || $(this).is('p')) {
				var id = $(this).attr('id');
				
				// handling for p tag created on enter
				if (id == '' || id == null) {
					id = tinymce.DOM.uniqueId('struct_');
					$(this).attr('id', id).attr('class', 'paraTag');
					structs[id] = {
						lang: $(this).attr('lang'),
						'class': 'paraTag',
						type: 'para'
					};
				}
				
				var info = structs[id];
				var title = titles[info.type];
				newNodeParent = $('#tree').jstree('create_node', nodeParent, 'last', {
					data: title,
					attr: {name: id, 'class': $(this).attr('class')},
					state: null
				});
				$('#tree').jstree('open_node', nodeParent, false, true);
			}
			doStructureTreeUpdate(newChildren, newNodeParent);
		});
	};
	
	var highlightStructureTag = function(id) {
		editor.dom.setAttribs(editor.dom.select('*[name="selected"]'), {name: '', style: ''});
		if (id) {
			editor.dom.setAttribs(editor.dom.select('#'+id), {name: 'selected', style: 'background-color: #eee'});
		}
	};
	
	var removeHighlights = function() {
		highlightEntity();
		highlightStructureTag();
	};
	
	$('#separator').click(toggleEntitiesList);
	
	$('#tabs').tabs();
	
	$('#sequence').button().click(function() {
		updateEntitesList('sequence');
		highlightEntity(editor.currentEntity);
	});
	$('#category').button().click(function() {
		updateEntitesList('category');
		highlightEntity(editor.currentEntity);
	});
	$('#sortBy').buttonset();
	
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
			items: function(node) {
				if ($(node).attr('id') == 'root') return {};
				var items = {
					'edit': {
						label: 'Edit',
						action: function(obj) {
							var tag = editor.$('#'+obj.attr('name'));
							editor.execCommand('editCustomTag', tag);
						}
					},
					'delete': {
						label: 'Delete',
						action: function(obj) {
							removeStructureTag(obj.attr('name'));
						}
					}
				};
				if ($(node).hasClass('headTag') || $(node).hasClass('emphTag')) {
					delete items.edit;
				} else if ($(node).hasClass('paraTag')) {
					delete items['delete'];
				}
				return items;
			}
		},
		plugins: ['json_data', 'ui', 'themeroller', 'contextmenu']
	});
	$('#tree').bind('select_node.jstree', function(event, data) {
		var node = data.rslt.obj;
		var id = node.attr('name');
		highlightStructureTag(id);
	});
	$('#tree').bind('hover_node.jstree', function(event, data) {
		var node = data.rslt.obj;
		
		if (node.attr('id') == 'root') return;
		
		var pos = node.offset();
		pos.left += node.width();
		
		var id = node.attr('name');
		var info = structs[id];
		var content = '<ul>';
		for (var key in info) {
			content += '<li>'+key+': '+info[key]+'</li>';
		}
		content += '</ul>';
		showPopup(pos, content);
	});
	$('#tree').bind('dehover_node.jstree', function(event, data) {
		hidePopup();
	});
	
	$('#editor').tinymce({
		
		script_url : 'js/tinymce/jscripts/tiny_mce/tiny_mce.js',
		theme: 'advanced',
		
		content_css: cssLocation,
		
		width: '100%',
		
		setup: function(ed) {
			editor = ed;
			
			// custom properties added to the editor
			ed.currentEntity = null; // the key/id of the currently highlighted entity
			ed.contextMenuPos = null; // the position of the context menu (used to position related dialog box)
			
			ed.onInit.add(editor_oninit);
			ed.onChange.add(onChangeHandler);
			
			ed.addButton('removeentity', {
				title: 'Remove Entity',
				image: 'img/script_delete.png',
				'class': 'entityButton',
				cmd: 'removeEntity'
			});
			
//			ed.addButton('toggleeditor', {
//				title: 'Show Advanced Mode',
//				image: 'img/html.png',
//				'class': 'entityButton',
//				cmd: 'toggle_editor'
//			});
		},
		
		doctype: '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">',
		element_format: 'xhtml',
		
//		forced_root_block : 'div',
//		force_br_newlines: false,
//		force_p_newlines: false,
		
		extended_valid_elements: 'entity[class|name],struct[class|level|ref|lang|id]',
		custom_elements: '~entity,~struct',
		
		plugins: 'save,entitycontextmenu,entitybutton,customtags,viewsource',
		theme_advanced_blockformats: 'p,h1,blockquote',
		theme_advanced_buttons1: 'customtags,|,entitybutton,removeentity,|,viewsource',
		theme_advanced_buttons2: '',
		theme_advanced_buttons3: '',
		theme_advanced_toolbar_location: 'top',
		theme_advanced_toolbar_align: 'left',
        theme_advanced_statusbar_location: 'bottom'
	});
	
	$(window).resize(doResize);
});