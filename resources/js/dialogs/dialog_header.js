var HeaderDialog = function(config) {
	var w = config.writer;
	
	var currentParent = null;
	var currentAddType = null;
	
	$('#header').append(''+
	'<div id="headerLink"><h2>Edit Header</h2></div>');
	
	$(document.body).append(''+
	'<div id="headerDialog">'+
	'<h1>File Description</h1>'+
	'<h2>Title Statement</h2>'+
	'<div><label for="tei_title">Title</label><input type="text" id="tei_title" name="title"/></div>'+
	'<div><label for="tei_author">Author</label><input type="text" id="tei_author" name="author"/></div>'+
	'<h3>Responsiblity Statement</h3>'+
	'<div><label for="tei_resp">Responsibility</label><input type="text" id="tei_resp" name="resp"/></div>'+
	'<div><label for="tei_name">Name</label><input type="text" id="tei_name" name="name"/></div>'+
	'<h2>Publication Statement</h2>'+
	'<div><label for="tei_distributor">Distributor</label><input type="text" id="tei_distributor" name="distributor"/></div>'+
	'<div><label for="tei_address">Address</label><input type="text" id="tei_address" name="address"/></div>'+
	'<div><label for="tei_idno">Identifier</label><input type="text" id="tei_idno" name="idno"/></div>'+
	'<div><label for="tei_date">Date</label><input type="text" id="tei_date" name="date"/></div>'+
	'<h2>Source Description</h2>'+
	'<div><label for="tei_bibl">Bibliographic Citation</label><input type="text" id="tei_bibl" name="bibl"/></div>'+
	'<p style="font-weight: bold;">NB: For demo purposes only. Saving not yet supported.</p>'+
	'</div>'+
//	'<div id="headerDialog"><ul id="headerForm"></ul></div>'+
//	'<div id="headerAddDialog">'+
//	'<div id="headerText"><h3>Add text content</h3><textarea /></div>'+
//	'<div id="headerTags"><h3>Select a tag to add</h3><select></select><div id="headerDoc" /></div>'+
//	'</div>'+
//	'<div id="headerRemoveDialog">'+
//	'<p>Are you sure you want to remove the selected content?</p>'+
	'</div>');
	
	var header = $('#headerDialog');
	header.dialog({
		title: 'Edit Header',
		modal: true,
		resizable: false,
		closeOnEscape: false,
		open: function(event, ui) {
			header.parent().find('.ui-dialog-titlebar-close').hide();
		},
		height: 520,
		width: 400,
		autoOpen: false,
		buttons: {
			'Ok': function() {
				header.dialog('close');
			},
			'Cancel': function() {
				header.dialog('close');
			}
		}
	});
	
	$('#headerLink').click(function() {
		header.dialog('open');
	});
	
	var headerAdd = $('#headerAddDialog');
	headerAdd.dialog({
		title: 'Add Content',
		modal: true,
		resizable: true,
		closeOnEscape: false,
		open: function(event, ui) {
			headerAdd.parent().find('.ui-dialog-titlebar-close').hide();
		},
		height: 300,
		width: 330,
		autoOpen: false,
		buttons: {
			'Add': function() {
				if (currentAddType == 'tag') {
					var selected = headerAdd.find('select option:selected');
					if (selected.length == 1) {
						doAdd(selected.text());
						headerAdd.dialog('close');
					} else {
						w.d.show('message', {
							title: 'Error',
							msg: 'Please select a tag to add.',
							type: 'error'
						});
					}
				} else {
					var text = headerAdd.find('textarea').val();
				}
			},
			'Cancel': function() {
				headerAdd.dialog('close');
			}
		}
	});
	
	var headerRemove = $('#headerRemoveDialog');
	headerRemove.dialog({
		title: 'Remove Content',
		modal: true,
		resizable: false,
		closeOnEscape: false,
		open: function(event, ui) {
			headerRemove.parent().find('.ui-dialog-titlebar-close').hide();
		},
		height: 150,
		width: 220,
		autoOpen: false,
		buttons: {
			'Remove': function() {
				currentParent.parent().remove();
				headerRemove.dialog('close');
			},
			'Cancel': function() {
				headerRemove.dialog('close');
			}
		}
	});
	
	function doAdd(tag) {
		buildRow(currentParent, tag);
	}
	
	function showAddDialog(tag) {
		if (currentAddType == 'text') {
			$('#headerTags').hide();
			$('#headerText').show();
			$('#headerText textarea').val('');
		} else {
			$('#headerTags').show();
			$('#headerText').hide();
			$('#headerDoc').empty();
			var select = headerAdd.find('select');
			select.empty();
			var children = w.getChildrenForTag({tag: tag, type: 'element', returnType: 'array'});
			for (var i = 0; i < children.length; i++) {
				var c = children[i];
				select.append('<option>'+c.name+'</option>');
				select.find('option:last').data('tag', c.element);
			}
			select.attr('size', Math.min(children.length, 8));
			select.find('option').click(function() {
				var tag = $(this).data('tag');
				var doc = $('a\\:documentation, documentation', tag).first().text();
				$('#headerDoc').html(doc);
			});
		}
		headerAdd.dialog('open');
	}
	
	function buildRow(parent, tag) {
		var isRoot = parent.attr('id') == 'headerForm';
		var rootClass = isRoot ? 'root' : '';
		var extraButtons = isRoot ? '' : '<button>- Tag</button><button>Text</button>';
		var rowString = '<li class="'+rootClass+'"><label>'+tag+'</label><button>+ Tag</button>'+extraButtons+'<ul></ul></li>';
		parent.append(rowString);
		parent.find('li:last').hover(function() {
			$('#headerForm li').removeClass('over');
			$(this).addClass('over');
		}, function() {
			$(this).removeClass('over');
		}).find('button').each(function(index, el) {
			$(this).button();
			switch(index) {
				case 0:
					$(this).click(function() {
						currentParent = $(this).nextAll('ul');
						currentAddType = 'tag';
						var tag = $(this).prevAll('label').text();
						showAddDialog(tag);
					});
					break;
				case 1:
					$(this).click(function() {
						currentParent = $(this).nextAll('ul');
						headerRemove.dialog('open');
					});
					break;
				case 2:
					$(this).click(function() {
						currentParent = $(this).nextAll('ul');
						currentAddType = 'text';
						showAddDialog();
					});
			}
		});
	}
	
	function doUpdate() {
		
	}
	
	function initHeader() {
//		$('#headerForm').empty();
//		var header = w.editor.$('span[_tag="'+w.header+'"]');
//		if (header.length == 1) {
//			
//		}
//		buildRow($('#headerForm'), w.header);
//		var children = w.getChildrenForTag({tag: w.header, type: 'element', returnType: 'array'});
//		var parent = $('#headerForm > li > ul');
//		for (var i = 0; i < children.length; i++) {
//			buildRow(parent, children[i].name);
//		}
	}
	
	w.initHeader = initHeader;
	
	return {
		show: function(config) {
			header.dialog('open');
		},
		hide: function() {
			header.dialog('close');
		}
	};
};