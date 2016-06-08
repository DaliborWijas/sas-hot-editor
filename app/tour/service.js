angular.module('ngmTour', [])

.factory('ngmTour', [
  '$mdMedia',
  function($mdMedia) {
    //do not display tour on small devices
    if(!$mdMedia('gt-sm')) {
      return;
    }

    var items = document.querySelectorAll('[ngm-tour-step]');

    var itemInd = 0,
        currentItem = items[0];

    var tourEl, overlayEl, messageEl, nextButtonEl, wrapperEl;

    angular.element(document.body).append('<div id="tour"></div>');
    tourEl = angular.element(document.querySelector('#tour'));

    tourEl.append('<div class="wrapper"><div class="message"></div><md-button class="md-button md-ink-ripple button md-raised md-primary">Next</md-button></div>');
    wrapperEl = angular.element(document.querySelector('#tour .wrapper'));
    messageEl = angular.element(document.querySelector('#tour .message'));
    nextButtonEl = angular.element(document.querySelector('#tour .button'));

    nextButtonEl.on('click', function() {
      if(nextButtonEl[0].innerHTML === 'Close') {
        tourEl.remove();
        window.localStorage.setItem('tourDone', true);
        return;
      }

      clean();

      if(++itemInd === items.length - 1) {
        nextButtonEl[0].innerHTML = 'Close';
      }

      currentItem = items[itemInd];
      display();
    });

    function clean() {
      overlayEl[0].remove();
      wrapperEl[0].style['transition-delay'] = '0s';
      wrapperEl[0].style['transition-duration'] = '0s';
      wrapperEl[0].style.opacity = 0;

      angular.element(currentItem).off('click', onSelectClick);
      angular.element(document.querySelectorAll('.md-select-menu-container.md-active md-option')).off('click', onSelectItemClick);
    }

    function display() {
      var boundingRect = currentItem.getBoundingClientRect();

      tourEl.prepend('<div class="overlay"></div>');
      overlayEl = angular.element(document.querySelector('#tour .overlay'));

      var color = angular.element(currentItem).attr('ngm-tour-color');
      if(color) {
        var r = parseInt('0x' + color.substr(1, 2)),
            g = parseInt('0x' + color.substr(3, 2)),
            b = parseInt('0x' + color.substr(5, 2));
        overlayEl[0].style['box-shadow'] = 'rgba(' + r + ', ' + g + ', ' + b + ', 0.7) 0px 0px 0px 100vmax';
      }

      overlayEl[0].style.top = boundingRect.top + currentItem.clientHeight / 2 + 'px';
      overlayEl[0].style.left = boundingRect.left + currentItem.clientWidth / 2 + 'px';
      overlayEl[0].style.width = boundingRect.width + 2 + 'px';
      overlayEl[0].style.height = boundingRect.height + 2 + 'px';

      messageEl[0].innerHTML = angular.element(currentItem).attr('ngm-tour-msg');

      if(!angular.element(currentItem).attr('ngm-tour-float')) {
        if(document.body.clientWidth - boundingRect.right > boundingRect.left) {
          //message and button should be on the right
          wrapperEl[0].style.top = '50%';
          wrapperEl[0].style.right = boundingRect.right / 2 + 'px';
          if(wrapperEl[0].clientWidth > boundingRect.right) {
            wrapperEl[0].style.width = boundingRect.right - 4 + 'px';
          }
        } else {
          //message and button should be on the left
          wrapperEl[0].style.top = '50%';
          wrapperEl[0].style.left = boundingRect.left / 2 + 'px';
          if(wrapperEl[0].clientWidth > boundingRect.left) {
            wrapperEl[0].style.width = boundingRect.left - 4 + 'px';
          }
        }

        wrapperEl[0].style['transition-delay'] = '0.25s';
        wrapperEl[0].style['transition-duration'] = '0.5s';
        wrapperEl[0].style.opacity = 1;
      }

      angular.element(currentItem).on('click', onSelectClick);
    }

    function onSelectClick(e) {
      var selectEl = e.target;
      while(selectEl && selectEl.tagName !== 'MD-SELECT') {
        selectEl = selectEl.parentNode;
      }
      if(selectEl) {
        setTimeout(function() {
          var selectMenu = document.querySelector('.md-select-menu-container.md-active');
          var selectMenuBoundingRect = selectMenu.getBoundingClientRect();

          overlayEl[0].style.top = selectMenuBoundingRect.top + selectMenuBoundingRect.height / 2 + 'px';
          overlayEl[0].style.left = selectMenuBoundingRect.left + selectMenuBoundingRect.width / 2 + 'px';
          overlayEl[0].style.width = selectMenuBoundingRect.width + 2 + 'px';
          overlayEl[0].style.height = selectMenuBoundingRect.height + 2 + 'px';

          angular.element(document.querySelectorAll('.md-select-menu-container.md-active md-option')).on('click', onSelectItemClick);
        }, 100);
      }
    }

    function onSelectItemClick(e) {
      var boundingRect = currentItem.getBoundingClientRect();
      overlayEl[0].style.top = boundingRect.top + currentItem.clientHeight / 2 + 'px';
      overlayEl[0].style.left = boundingRect.left + currentItem.clientWidth / 2 + 'px';
      overlayEl[0].style.width = boundingRect.width + 2 + 'px';
      overlayEl[0].style.height = boundingRect.height + 2 + 'px';
    }

    return {
      start: function() {  
        display();
      },
      isDone: function() {
        if(window.localStorage) {
          if(window.localStorage.getItem('tourDone')) return;
        } else {
          alert('Your browser does not support Local Storage.\nPlease upgrade to a newer browser');
        }
      }
    };
  }
]);
