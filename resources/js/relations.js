function Relations(config) {
	
	var w = config.writer;
	
	$(config.parentId).append('<div id="relations"><ul class="relationsList"></ul></div>');
	$(document.body).append(''+
		'<div id="relationsMenu" class="contextMenu" style="display: none;"><ul>'+
		'<li id="removeRelation"><ins style="background:url(img/cross.png) center center no-repeat;" />Remove Relation</li>'+
		'</ul></div>'
	);
	
	var pm = {};
	
	/**
	 * @memberOf pm
	 */
	pm.update = function() {
		$('#relations ul').empty();
		
		var relationsString = '';
		
		for (var i = 0; i < w.triples.length; i++) {
			var triple = w.triples[i];
			relationsString += '<li>'+triple.subject.text+' '+triple.predicate.text+' '+triple.object.text+'</li>';
		}
		
		$('#relations ul').html(relationsString);
		
		$('#relations ul li').each(function(index, el) {
			$(this).data('index', index);
		}).contextMenu('relationsMenu', {
			bindings: {
				'removeRelation': function(r) {
					var i = $(r).data('index');
					w.triples.splice(i, 1);
					pm.update();
				}
			},
			shadow: false,
			menuStyle: {
			    backgroundColor: '#FFFFFF',
			    border: '1px solid #D4D0C8',
			    boxShadow: '1px 1px 2px #CCCCCC',
			    padding: '0px',
			    width: '105px'
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
	
	return pm;
};