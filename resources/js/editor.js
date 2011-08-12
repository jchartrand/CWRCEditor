var Writer = function(config) {
	var w = {
		editor: null, // reference to the tinyMCE instance we're creating, set in setup
		entities: {}, // entities store
		structs: {}, // structs store

		project: null, // the current project (cwrc or russell)
		
		// tag types and their titles
		titles: {
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
		},
			
		// possible results when trying to add entity
		NO_SELECTION: 0,
		NO_COMMON_PARENT: 1,
		VALID: 2,
		
		fm: null, // filemanager
		sp: null, // sidepanel
		d: null // dialog
	};
	
	var _findDeletedEntities = function() {
		for (var id in w.entities) {
			var nodes = w.editor.dom.select('entity[name="'+id+'"]');
			switch (nodes.length) {
				case 0:
					delete w.entities[id];
					w.sp.removeFromEntitiesList(id);
					break;
				case 1:
					editor.dom.remove(nodes[0]);
					delete w.entities[id];
					removeFromEntitiesList(id);
			}
		}
	};
	
	var _onInitHandler = function(ed) {
		ed.addCommand('isSelectionValid', w.isSelectionValid);
		ed.addCommand('showError', w.showError);
		ed.addCommand('addEntity', w.addEntity);
		ed.addCommand('removeEntity', w.removeEntity);
		ed.addCommand('addStructureTag', w.addStructureTag);
		ed.addCommand('editStructureTag', w.editStructureTag);
		ed.addCommand('updateStructureTree', w.sp.updateStructureTree);
		ed.addCommand('removeHighlights', w.removeHighlights);
		ed.addCommand('exportDocument', w.fm.exportDocument);
		ed.addCommand('loadDocument', w.fm.loadDocument);
		
		// used in conjunction with the paste plugin
		ed.pasteAsPlainText = true;
		
		// highlight tracking
		ed.onMouseUp.add(_doHighlightCheck);
		
		ed.onKeyUp.add(function(ed, evt) {
			// nav keys check
			if (evt.keyCode >= 33 || evt.keyCode <= 40) {
				_doHighlightCheck(ed, evt);
			}
			
			// update current entity
			if (ed.currentEntity) {
				var content = ed.$('#entityHighlight').text();
				var entity = w.entities[ed.currentEntity];
				entity.content = content;
				entity.title = w.getTitleFromContent(content);
				$('#entities li[name="'+ed.currentEntity+'"] > span[class="title"]').html(entity.title);
			}
			
			// delete keys check
			// need to do this here instead of in onchangehandler because that one doesn't update often enough
			if (evt.keyCode == 8 || evt.keyCode == 46) {
				_findDeletedEntities();
//				for (key in structs) {
//					var struct = editor.dom.get('#'+key);
//					if (!struct) {
//						updateStructureTree();
//						break;
//					}
//				}
			}
//			
//			// enter key check
//			if (evt.keyCode == 13) {
//				updateStructureTree();
//			}
		});
		
		_doResize();
		
		// populate with the initial paragraph
		w.sp.updateStructureTree(true);
	};
	
	var _onChangeHandler = function(ed) {
		if (ed.isDirty()) {
			w.sp.updateStructureTree(true);
			_findDeletedEntities();
		}
	};
	
	var _doHighlightCheck = function(ed, evt) {
		w.highlightStructureTag();
		
		var range = ed.selection.getRng(true);
		
		var entityStart = _findEntityBoundary('start', range.startContainer, null, [range.startContainer.parentNode]);
		var entityEnd = _findEntityBoundary('end', range.endContainer, null, [range.endContainer.parentNode]);
		
		if (entityEnd == null || entityStart == null) {
			w.highlightEntity();
			return;
		}
		
		var startKey = entityStart.getAttribute('name');
		var endKey = entityEnd.getAttribute('name');
		
		// priority goes to startKey if they aren't the same
		if (startKey == ed.currentEntity) return;
		
		var bm = ed.selection.getBookmark();
		w.highlightEntity(startKey, bm);
	};
	
	/**
	 * Searches for an entity boundary containing the current node.
	 * @param boundaryType Either 'start' or 'end'.
	 * @param currentNode The node that is currently being examined.
	 * @param currentId The id of an entity that is also contained within the entity we're looking for.  Used to prevent false positives.
	 * @param levels An array to track the levels of node depth in order to prevent endless recursion.
	 */
	var _findEntityBoundary = function(boundaryType, currentNode, currentId, levels) {
		if (w.editor.dom.hasClass(currentNode, 'entity')) {
			if (w.editor.dom.hasClass(currentNode, boundaryType)) {
				if (currentId == null || currentId != currentNode.getAttribute('name')) {
					return currentNode;
				} else if (currentId == currentNode.getAttribute('name')) {
					currentId = null;
				}
			} else {
				currentId = currentNode.getAttribute('name');
			}
		}
		
		if (boundaryType == 'start' && currentNode.lastChild) {
			levels.push(currentNode);
			return _findEntityBoundary(boundaryType, currentNode.lastChild, currentId, levels);
		} else if (boundaryType == 'end' && currentNode.firstChild) {
			levels.push(currentNode);
			return _findEntityBoundary(boundaryType, currentNode.firstChild, currentId, levels);
		}
		
		if (boundaryType == 'start' && currentNode.previousSibling) {
			return _findEntityBoundary(boundaryType, currentNode.previousSibling, currentId, levels);
		} else if (boundaryType == 'end' && currentNode.nextSibling) {
			return _findEntityBoundary(boundaryType, currentNode.nextSibling, currentId, levels);
		}
		
		if (currentNode.parentNode) {
			if (currentNode.parentNode == levels[levels.length-1]) {
				levels.pop();
				if (boundaryType == 'start' && currentNode.parentNode.previousSibling) {
					return _findEntityBoundary(boundaryType, currentNode.parentNode.previousSibling, currentId, levels);
				} else if (boundaryType == 'end' && currentNode.parentNode.nextSibling) {
					return _findEntityBoundary(boundaryType, currentNode.parentNode.nextSibling, currentId, levels);
				} else return null;
			} else {
				return _findEntityBoundary(boundaryType, currentNode.parentNode, currentId, levels);
			}
		}
		
		return null;
	};
	
	w.highlightEntity = function(id, bm, doScroll) {
		w.editor.currentEntity = null;
		
		var prevHighlight = w.editor.$('#entityHighlight');
		if (prevHighlight.length == 1) {
			var parent = prevHighlight.parent()[0];
			prevHighlight.contents().unwrap();
			parent.normalize();
			
			$('#entities > ul > li').each(function(index, el) {
				$(this).removeClass('selected').css('background-color', '').find('div[class="info"]').hide();
			});
		}
		
		if (id) {
			w.editor.currentEntity = id;
			var type = w.entities[id].props.type;
			var markers = w.editor.dom.select('entity[name="'+id+'"]');
			var start = markers[0];
			var end = markers[1];
			var typeColor = w.editor.$(start).css('border-left-color');
			
			var nodes = [start];
			var currentNode = start;
			while (currentNode != end  && currentNode != null) {
				currentNode = currentNode.nextSibling;
				nodes.push(currentNode);
			}
			
			w.editor.$(nodes).wrapAll('<span id="entityHighlight" />');
			w.editor.$('#entityHighlight').css({
				'background-color': typeColor,
                'border-radius': '5px',
                'color': '#fff'
			});
			
			// maintain the original caret position
			if (bm) {
				w.editor.selection.moveToBookmark(bm);
			}
			
			if (doScroll) {
				var val = w.editor.$(start).offset().top;
				w.editor.$(w.editor.dom.doc.body).scrollTop(val);
			}
			
			$('#entities > ul > li[name="'+id+'"]').addClass('selected').css('background-color', typeColor).find('div[class="info"]').show();
		}
	};
	
	// checks the user selection and potential entity markers
	w.isSelectionValid = function(isStructTag) {
		var sel = w.editor.selection;
		if (sel.isCollapsed()) return w.NO_SELECTION;
		if (sel.getContent() == '') return w.NO_SELECTION;
		
		// check for overlap potential
		var range = sel.getRng(true);
		if (range.startContainer.parentNode != range.endContainer.parentNode) return w.NO_COMMON_PARENT;
		
		// extra check to make sure we're not overlapping with an entity
		if (isStructTag) {
			var c;
			var currentNode = range.startContainer;
			var ents = {};
			while (currentNode != range.endContainer) {
				currentNode = currentNode.nextSibling;
				c = $(currentNode);
				if (c.is('entity')) {
					if (c.hasClass('start')) {
						ents[c.attr('name')] = true;
					} else {
						if (ents[c.attr('name')]) {
							delete ents[c.attr('name')];
						} else {
							return w.NO_COMMON_PARENT;
						}
					}
				}
			}
			var count = 0;
			for (var id in ents) {
				count++;
			}
			if (count != 0) return w.NO_COMMON_PARENT;
		}
		
		return w.VALID;
	};
	
	w.showError = function(errorType) {
		switch(errorType) {
		case w.NO_SELECTION:
			w.d.showMessage({
				title: 'Error',
				msg: 'Please select some text before adding an entity or tag.'
			});
			break;
		case w.NO_COMMON_PARENT:
			w.d.showMessage({
				title: 'Error',
				msg: 'Please ensure that the beginning and end of your selection have a common parent.<br/>For example, your selection cannot begin in one paragraph and end in another, or begin in bolded text and end outside of that text.'
			});
		}
	};
	
	w.addEntity = function(type) {
		var result = w.isSelectionValid();
		if (result == w.VALID) {
			w.editor.currentEntity = _addEntityTag(type);
			var title = w.titles[type];
			if (type == 'note' || type == 'bibref') {
				w.d.showNote({type: type, title: title, pos: w.editor.contextMenuPos});
			} else if (type == 'date') {
				w.d.showDate({type: type, title: title, pos: w.editor.contextMenuPos});
			} else {
				var query = w.entities[w.editor.currentEntity].props.content;
				w.d.showSearch({type: type, title: title, query: query, pos: w.editor.contextMenuPos});
			}
		} else {
			w.showError(result);
		}
	};
	
	var _addEntityTag = function(type) {
		var sel = w.editor.selection;
		var content = sel.getContent();
		var range = sel.getRng(true);
		
		// strip tags
		content = content.replace(/<\/?[^>]+>/gi, '');
		
		// trim whitespace
		if (range.startContainer == range.endContainer) {
			var leftTrimAmount = content.match(/^\s{0,1}/)[0].length;
			var rightTrimAmount = content.match(/\s{0,1}$/)[0].length;
			range.setStart(range.startContainer, range.startOffset+leftTrimAmount);
			range.setEnd(range.endContainer, range.endOffset-rightTrimAmount);
			sel.setRng(range);
			content = content.replace(/^\s+|\s+$/g, '');
		}
		
		var title = w.getTitleFromContent(content);
		
		var id = tinymce.DOM.uniqueId('ent_');
		
		w.entities[id] = {
			props: {
				id: id,
				type: type,
				title: title,
				content: content
			},
			info: {}
		};
		
		w.insertBoundaryTags(id, type, range);
		
		return id;
	};
	
	w.insertBoundaryTags = function(id, type, range) {
		var sel = w.editor.selection;
		var bm = sel.getBookmark();
		
		var start = w.editor.dom.create('entity', {'class': 'entity '+type+' start', 'name': id});
		range.insertNode(start);
		w.editor.dom.bind(start, 'click', _doMarkerClick);
		
		w.editor.selection.moveToBookmark(bm);
		
		var end = w.editor.dom.create('entity', {'class': 'entity '+type+' end', 'name': id});
		sel.collapse(false);
		range = sel.getRng(true);
		range.insertNode(end);
		w.editor.dom.bind(end, 'click', _doMarkerClick);
	};
	
	w.finalizeEntity = function(id, info) {
		if (info == null) {
			w.removeEntity(id);
		} else {
			w.entities[id].info = info;
			w.sp.updateEntitesList();
			w.highlightEntity(id);
		}
	};
	
	w.removeEntity = function(id) {
		id = id || w.editor.currentEntity;
		
		delete w.entities[id];
		
		w.editor.dom.remove(w.editor.dom.select('entity[name="'+id+'"]'));
		
		w.highlightEntity();
		
		w.sp.removeFromEntitiesList(id);
	};
	
	w.getTitleFromContent = function(content) {
		if (content.length <= 34) return content;
		var title = content.substring(0, 34) + '&#8230;';
		return title;
	};
	
	// prevents the user from moving the caret inside a marker
	var _doMarkerClick = function(e) {
		var marker = w.editor.dom.get(e.target);
		var range = w.editor.selection.getRng(true);
		if (w.editor.dom.hasClass(marker, 'start')) {
			range.setStartAfter(marker);
			range.setEndAfter(marker);
		} else {
			range.setStartBefore(marker);
			range.setEndBefore(marker);
		}
		editor.selection.setRng(range);
		highlightEntity(marker.getAttribute('name'), w.editor.selection.getBookmark());
	};
	
	var _doResize = function() {
		var newHeight = $(window).height() - 30;
		$('#leftcol > div').height(newHeight);
		$('#'+w.editor.id+'_ifr').height(newHeight - 49);
	};
	
	var _showPopup = function(content) {
		$('#popup').html(content).show();
	};
	
	var _hidePopup = function() {
		$('#popup').hide();
	};
	
	w.addStructureTag = function(bookmark, attributes) {
		var id = tinymce.DOM.uniqueId('struct_');
		attributes.id = id;
		w.structs[id] = attributes;
		
		var tag, open_tag, close_tag;
		tag = 'struct';
		if (attributes.type == 'para') {
			tag = 'p';
		}
		
		w.editor.selection.moveToBookmark(bookmark);
		var selection = w.editor.selection.getContent();
		
		open_tag = '<'+tag;
		for (var key in attributes) {
			open_tag += ' '+key+'="'+attributes[key]+'"';
		}
		open_tag += '>';
		close_tag = '</'+tag+'>';
		var content = open_tag + selection + close_tag;
		w.editor.execCommand('mceReplaceContent', false, content);
	};
	
	w.editStructureTag = function(tag, attributes) {
		var id = tag.attr('id');
		for (var key in attributes) {
			tag.attr(key, attributes[key]);
		}
		w.structs[id] = attributes;
		w.sp.updateStructureTree();
	};
	
	w.removeStructureTag = function(id) {
		var parent = w.editor.$('#'+id).parent()[0];
		w.editor.$('#'+id).contents().unwrap();
		parent.normalize();
		w.sp.updateStructureTree();
	};
	
	w.highlightStructureTag = function(id) {
		w.editor.dom.setAttribs(w.editor.dom.select('*[name="selected"]'), {name: '', style: ''});
		if (id) {
			w.editor.dom.setAttribs(w.editor.dom.select('#'+id), {name: 'selected', style: 'background-color: #eee'});
		}
	};
	
	w.removeHighlights = function() {
		w.highlightEntity();
		w.highlightStructureTag();
	};
	
	w.init = function() {
		$.ajax({
			url: 'http://cwrctc.artsrn.ualberta.ca/documents/info/projectname',
			success: function(data, status, xhr) {
				w.project = data;
			}
		});
		
		w.fm = new FileManager({
			writer: w
		});
		w.sp = new SidePanel({
			writer: w
		});
		w.d = new Dialog({
			writer: w
		});
		
		$('#separator').click(w.sp.toggleEntitiesList);
		$('#tabs').tabs();
		$('#sequence').button().click(function() {
			w.sp.updateEntitesList('sequence');
			w.highlightEntity(w.editor.currentEntity);
		});
		$('#category').button().click(function() {
			w.sp.updateEntitesList('category');
			w.highlightEntity(w.editor.currentEntity);
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
				show_at_node: false,
				items: function(node) {
					_hidePopup();
					if ($(node).attr('id') == 'root') return {};
					var items = {
						'edit': {
							label: 'Edit Tag',
							icon: 'img/tag_blue_edit.png',
							action: function(obj) {
								var tag = w.editor.$('#'+obj.attr('name'));
								var pos = {
									x: parseInt($('#popup').css('left')),
									y: parseInt($('#popup').css('top'))
								};
								w.editor.execCommand('editCustomTag', tag, pos);
							}
						},
						'delete': {
							label: 'Remove Tag',
							icon: 'img/delete.png',
							action: function(obj) {
								w.removeStructureTag(obj.attr('name'));
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
		$('#tree').mousemove(function(e) {
			$('#popup').offset({left: e.pageX+15, top: e.pageY+5});
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
		$('#editor').tinymce({
			script_url : 'js/tinymce/jscripts/tiny_mce/tiny_mce.js',
			theme: 'advanced',
			
			content_css: 'css/editor.css',
			
			width: '100%',
			
			contextmenu_never_use_native: true,
			
			setup: function(ed) {
				w.editor = ed;
				
				// custom properties added to the editor
				ed.currentEntity = null; // the id of the currently highlighted entity
				ed.contextMenuPos = null; // the position of the context menu (used to position related dialog box)
				
				ed.onInit.add(_onInitHandler);
				ed.onChange.add(_onChangeHandler);
				
				ed.addButton('removeentity', {
					title: 'Remove Entity',
					image: 'img/script_delete.png',
					'class': 'entityButton',
					cmd: 'removeEntity'
				});
				
				ed.addButton('savebutton', {
					title: 'Save',
					image: 'img/save.png',
					onclick: function() {
						w.fm.saveDocument();
					}
				});
				
				ed.addButton('saveasbutton', {
					title: 'Save As',
					image: 'img/save_as.png',
					onclick: function() {
						w.fm.openSaver();
					}
				});
				
				ed.addButton('loadbutton', {
					title: 'Load',
					image: 'img/folder_page.png',
					'class': 'entityButton',
					onclick: function() {
						w.fm.openLoader();
					}
				});
				
//				ed.addButton('toggleeditor', {
//					title: 'Show Advanced Mode',
//					image: 'img/html.png',
//					'class': 'entityButton',
//					cmd: 'toggle_editor'
//				});
			},
			
			doctype: '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">',
			element_format: 'xhtml',
			
//			forced_root_block : 'div',
//			force_br_newlines: false,
//			force_p_newlines: false,
			
			paste_remove_styles: true,
			paste_preprocess: function(pl, o) {
				// replace <br>s and <pre>s with <p>s
				o.content = o.content.replace(/(.*?)<br\s?\/?>/gi,'<p>$1</p>').replace(/<pre>(.*?)<\/pre>/gi,'<p>$1</p>');
			},
			
			extended_valid_elements: 'entity[class|name],struct[class|level|ref|lang|id|type],p[class|id|lang|type]',
			custom_elements: '~entity,~struct',
			
			plugins: 'paste,entitycontextmenu,entitybutton,customtags,viewsource',
			theme_advanced_blockformats: 'p,h1,blockquote',
			theme_advanced_buttons1: 'customtags,entitybutton,removeentity,|,viewsource,|,savebutton,saveasbutton,loadbutton',
			theme_advanced_buttons2: '',
			theme_advanced_buttons3: '',
			theme_advanced_toolbar_location: 'top',
			theme_advanced_toolbar_align: 'left',
	        theme_advanced_statusbar_location: 'bottom'
		});
		
		$(window).resize(_doResize);
	};
	
	return w;
};