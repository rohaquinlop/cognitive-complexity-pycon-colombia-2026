/**
 * Live complexity scorer for reveal.js code blocks.
 *
 * Usage: give a highlighted code block the class `cogc-block`, a stepped
 * `data-line-numbers="|3|5-6"` attribute, and a `data-cogc-steps` JSON array
 * aligned 1:1 with those steps:
 *
 *   [
 *     { "total": 0 },
 *     { "total": 1, "line": 3, "inc": 1, "nest": 0, "label": "for" },
 *     { "total": 3, "marks": [ { "line": 5, "inc": 2, "nest": 1, "label": "nested for" } ] }
 *   ]
 *
 * The highlight plugin clones the <code> element once per step. This script
 * bakes each step's *cumulative* badges, nesting bars and running total into
 * the corresponding clone at load time, so reveal's native fragment machinery
 * (forward, backward, jumps, overview, ?print-pdf) shows the right state with
 * no event handling. The only live behavior is a cosmetic count-up tween.
 *
 * Optional attributes:
 *   data-cogc-label="Cyclomatic Complexity"  heading of the total box
 *   data-cogc-mode="cc"                      neutral counter, no severity ramp
 */
/* global Reveal */
(function () {

	var SEVERITY = [
		{ max: 0, cls: 'cogc-sev-none' },
		{ max: 5, cls: 'cogc-sev-low' },
		{ max: 10, cls: 'cogc-sev-mid' },
		{ max: Infinity, cls: 'cogc-sev-high' }
	];

	function severityClass( total, mode ) {
		if( mode === 'cc' ) return 'cogc-sev-none';
		for( var i = 0; i < SEVERITY.length; i++ ) {
			if( total <= SEVERITY[i].max ) return SEVERITY[i].cls;
		}
	}

	function marksOf( step ) {
		if( Array.isArray( step.marks ) ) return step.marks;
		if( typeof step.line === 'number' ) return [ step ];
		return [];
	}

	// Adds badges + nesting bars for one mark to one code element's line table.
	function decorate( code, mark, mode ) {
		var cell = code.querySelector(
			'table.hljs-ln td.hljs-ln-code[data-line-number="' + mark.line + '"]'
		);
		if( !cell ) {
			console.warn( 'cogc-scorer: line ' + mark.line + ' not found in', code );
			return;
		}
		var row = cell.closest( 'tr' );
		row.classList.add( 'cogc-scored' );

		if( mode !== 'cc' && typeof mark.nest === 'number' ) {
			cell.classList.add( 'cogc-nest-' + Math.min( mark.nest, 3 ) );
		}

		var badgeCell = document.createElement( 'td' );
		badgeCell.className = 'cogc-badge-cell hljs-ln-line';
		var badge = document.createElement( 'span' );
		badge.className = 'cogc-badge';
		var inc = document.createElement( 'b' );
		inc.textContent = '+' + mark.inc;
		badge.appendChild( inc );
		if( mark.label ) {
			badge.appendChild( document.createTextNode( mark.label ) );
		}
		badgeCell.appendChild( badge );
		row.appendChild( badgeCell );
	}

	function totalBox( total, label, mode ) {
		var box = document.createElement( 'div' );
		box.className = 'cogc-total ' + severityClass( total, mode );
		box.innerHTML =
			'<span class="cogc-total-label"></span>' +
			'<span class="cogc-total-value"></span>';
		box.querySelector( '.cogc-total-label' ).textContent = label;
		box.querySelector( '.cogc-total-value' ).textContent = total;
		return box;
	}

	function initBlock( code ) {
		var steps;
		try {
			steps = JSON.parse( code.getAttribute( 'data-cogc-steps' ) );
		}
		catch( e ) {
			console.warn( 'cogc-scorer: invalid data-cogc-steps JSON', code, e );
			return;
		}

		var pre = code.closest( 'pre' );
		var mode = code.getAttribute( 'data-cogc-mode' ) || 'cogc';
		var label = code.getAttribute( 'data-cogc-label' ) ||
			( mode === 'cc' ? 'Cyclomatic' : 'Cognitive Complexity' );

		// Step clones created by the highlight plugin, in step order.
		var clones = Array.prototype.slice.call( pre.querySelectorAll( 'code.fragment' ) );
		var blocks = [ code ].concat( clones );

		if( steps.length !== blocks.length ) {
			console.warn(
				'cogc-scorer: ' + steps.length + ' steps for ' + blocks.length +
				' fragment states (they must match)', pre
			);
		}

		blocks.forEach( function( block, i ) {
			var step = steps[ i ];
			if( !step ) return;

			// Bake the *cumulative* marks of steps 1..i into this state.
			for( var s = 1; s <= i; s++ ) {
				if( !steps[ s ] ) continue;
				marksOf( steps[ s ] ).forEach( function( mark ) {
					decorate( block, mark, mode );
				} );
			}

			block.setAttribute( 'data-cogc-total', step.total );
			// In-flow header strip (not absolutely positioned): it can never
			// overlap badges, and base/clone geometry stays identical.
			block.insertBefore( totalBox( step.total, label, mode ), block.firstChild );
		} );
	}

	// ---- cosmetic count-up tween on live stepping --------------------------

	var tweens = {}; // per-<pre> handle so rapid stepping cancels cleanly
	var tweenId = 0;

	function tweenTotal( block, from ) {
		var box = block.querySelector( '.cogc-total' );
		if( !box ) return;
		var value = box.querySelector( '.cogc-total-value' );
		var to = parseInt( block.getAttribute( 'data-cogc-total' ), 10 );
		if( isNaN( to ) || from === to ) return;

		var pre = block.closest( 'pre' );
		var key = pre.dataset.cogcTween || ( pre.dataset.cogcTween = ++tweenId );
		if( tweens[ key ] ) cancelAnimationFrame( tweens[ key ] );

		var start = null;
		var DURATION = 400;
		function frame( ts ) {
			if( start === null ) start = ts;
			var t = Math.min( ( ts - start ) / DURATION, 1 );
			var eased = 1 - Math.pow( 1 - t, 3 );
			value.textContent = Math.round( from + ( to - from ) * eased );
			if( t < 1 ) {
				tweens[ key ] = requestAnimationFrame( frame );
			}
			else {
				value.textContent = to;
				delete tweens[ key ];
			}
		}
		tweens[ key ] = requestAnimationFrame( frame );
	}

	function isScorerClone( el ) {
		return el && el.matches &&
			el.matches( 'code.cogc-block' ) && el.hasAttribute( 'data-cogc-total' );
	}

	// The state visible after `hidden` goes away: the last still-visible clone,
	// or the base block.
	function visibleState( pre, hidden ) {
		var visible = pre.querySelectorAll( 'code.fragment.visible' );
		for( var i = visible.length - 1; i >= 0; i-- ) {
			if( visible[ i ] !== hidden ) return visible[ i ];
		}
		return pre.querySelector( 'code.cogc-block' );
	}

	function currentTotal( block ) {
		return parseInt( block.getAttribute( 'data-cogc-total' ), 10 ) || 0;
	}

	function init() {
		// :not(.fragment) — the highlight plugin's per-step clones carry the same
		// class/attributes as the original; only the original anchors a block.
		document.querySelectorAll( 'code.cogc-block[data-cogc-steps]:not(.fragment)' )
			.forEach( initBlock );

		Reveal.on( 'fragmentshown', function( event ) {
			var fragments = event.fragments || [ event.fragment ];
			fragments.forEach( function( fragment ) {
				if( !isScorerClone( fragment ) ) return;
				var prev = visibleState( fragment.closest( 'pre' ), fragment );
				tweenTotal( fragment, currentTotal( prev ) );
			} );
		} );

		Reveal.on( 'fragmenthidden', function( event ) {
			var fragments = event.fragments || [ event.fragment ];
			fragments.forEach( function( fragment ) {
				if( !isScorerClone( fragment ) ) return;
				var next = visibleState( fragment.closest( 'pre' ), fragment );
				tweenTotal( next, currentTotal( fragment ) );
			} );
		} );
	}

	if( typeof Reveal !== 'undefined' && Reveal.isReady && Reveal.isReady() ) {
		init();
	}
	else {
		Reveal.on( 'ready', init );
	}

})();
