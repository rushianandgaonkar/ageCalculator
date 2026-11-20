(function () {
  'use strict';

  var searchInput = document.getElementById('exam-search');
  var countEl = document.getElementById('exam-search-count');
  var table = document.getElementById('exam-table');
  if (!searchInput || !table) return;

  var rows = Array.from(table.querySelectorAll('tbody tr.exam-row'));
  var totalRows = rows.length;
  var quickPills = Array.from(document.querySelectorAll('.filter-pill'));

  function updateActivePill(val) {
    quickPills.forEach(function (pill) {
      var term = (pill.getAttribute('data-filter-term') || '').toLowerCase();
      if ((!val && !term) || (val && term === val)) {
        pill.classList.add('is-active');
      } else {
        pill.classList.remove('is-active');
      }
    });
  }

  function filterExams() {
    var query = searchInput.value.trim().toLowerCase();
    var matchCount = 0;

    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      if (!query) {
        row.hidden = false;
        matchCount++;
        continue;
      }

      var text = (row.textContent || '').toLowerCase();
      var keywords = (row.getAttribute('data-keywords') || '').toLowerCase();
      var matches = text.indexOf(query) !== -1 || keywords.indexOf(query) !== -1;

      row.hidden = !matches;
      if (matches) matchCount++;
    }

    if (countEl) {
      if (!query) {
        countEl.textContent = 'Showing all ' + totalRows + ' exams';
      } else if (matchCount === 0) {
        countEl.textContent = 'No matching exams found';
      } else if (matchCount === 1) {
        countEl.textContent = 'Showing 1 matching exam';
      } else {
        countEl.textContent = 'Showing ' + matchCount + ' of ' + totalRows + ' exams';
      }
    }

    updateActivePill(query);
  }

  searchInput.addEventListener('input', filterExams);

  searchInput.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      searchInput.value = '';
      filterExams();
    }
  });

  quickPills.forEach(function (pill) {
    pill.addEventListener('click', function (e) {
      e.preventDefault();
      var term = pill.getAttribute('data-filter-term') || '';
      searchInput.value = term;
      filterExams();
      searchInput.focus();
    });
  });

  // Initialize display count and pill state
  filterExams();
})();
