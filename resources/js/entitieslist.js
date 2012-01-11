var EntitiesList = function(config) {
	
	var w = config.writer;
	
	var entitiesList = {};
	
	$(document.body).append(''+
		'<div id="entitiesMenu" class="contextMenu" style="display: none;"><ul>'+
		'<li id="editEntity"><ins style="background:url(img/tag_blue_edit.png) center center no-repeat;" />Edit Tag</li>'+
		'<li id="removeEntity"><ins style="background:url(img/cross.png) center center no-repeat;" />Remove Tag</li>'+
		'<li class="separator" id="copyEntity"><ins style="background:url(img/tag_blue_copy.png) center center no-repeat;" />Copy Tag</li>'+
		'</ul></div>'
	);
	
	$('#sequence').button().click(function() {
		w.entitiesList.update('sequence');
		w.highlightEntity(w.editor.currentEntity);
	});
	$('#category').button().click(function() {
		w.entitiesList.update('category');
		w.highlightEntity(w.editor.currentEntity);
	});
	$('#sortBy').buttonset();
	
	entitiesList.update = function(sort) {
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
					entitiesString += '<li class="'+entry.props.type+'" name="'+entry.props.id+'">'+
						'<span class="box"/><span class="entityTitle">'+entry.props.title+'</span><div class="info">'+infoString+'</div>'+
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
				entitiesString += '<li class="'+entry.props.type+'" name="'+entry.props.id+'">'+
					'<span class="box"/><span class="entityTitle">'+entry.props.title+'</span><div class="info">'+infoString+'</div>'+
				'</li>';
			}
		}
		
		$('#entities > ul').html(entitiesString);
		$('#entities > ul > li').hover(function() {
			if (!$(this).hasClass('selected')) {
				$(this).addClass('over');
			}
		}, function() {
			if (!$(this).hasClass('selected')) {
				$(this).removeClass('over');
			}
		}).mousedown(function(event) {
			$(this).removeClass('over');
			w.highlightEntity(this.getAttribute('name'), null, true);
		}).contextMenu('entitiesMenu', {
			bindings: {
				'editEntity': function(tag) {
					w.editTag($(tag).attr('name'));
				},
				'removeEntity': function(tag) {
					w.removeEntity($(tag).attr('name'));
				},
				'copyEntity': function(tag) {
					w.copyEntity($(tag).attr('name'));
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
	
	entitiesList.remove = function(id) {
		$('#entities li[name="'+id+'"]').remove();
	};
	
	return entitiesList;
};