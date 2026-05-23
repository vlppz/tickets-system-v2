export const ANSWER_STATUS_OPTIONS = [
  { value: 'waiting', label: 'Ожидает проверки', color: '#374151', bg: '#f3f4f6' },
  { value: 'approved', label: 'Принято', color: '#065f46', bg: '#d1fae5' },
  { value: 'edits_required', label: 'Нужны правки', color: '#92400e', bg: '#fef3c7' },
  { value: 'declined', label: 'Отклонено', color: '#991b1b', bg: '#fee2e2' }
];

const ANSWER_STATUS_CONFIG = ANSWER_STATUS_OPTIONS.reduce((acc, item) => {
  acc[item.value] = item;
  return acc;
}, {});

export function getAnswerStatusConfig(status) {
  return ANSWER_STATUS_CONFIG[status] || ANSWER_STATUS_CONFIG.waiting;
}

export function getAnswerComments(answerOrComments) {
  const comments = Array.isArray(answerOrComments) ? answerOrComments : answerOrComments?.comments;
  return Array.isArray(comments) ? comments : [];
}

export function getLatestComment(answerOrComments, authorRole = null) {
  const comments = getAnswerComments(answerOrComments);

  for (let index = comments.length - 1; index >= 0; index -= 1) {
    const comment = comments[index];
    const body = typeof comment?.body === 'string' ? comment.body.trim() : '';

    if (authorRole && comment?.author_role !== authorRole) {
      continue;
    }

    if (body) {
      return comment;
    }
  }

  return null;
}

export function formatTicketDate(rawDate) {
  if (!rawDate) {
    return '—';
  }

  const date = new Date(rawDate);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function getCommentRoleLabel(role) {
  return role === 'admin' ? 'Администратор' : 'Пользователь';
}
