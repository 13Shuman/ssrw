import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export const useHotkeys = (searchRef) => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      
      // Ctrl+K / Cmd+K → фокус на поиск
      if (isCtrlOrCmd && e.key === 'k') {
        e.preventDefault();
        searchRef?.current?.focus();
      }
      // N → создать новый сниппет
      if (e.key === 'n' && !isCtrlOrCmd && !e.target.closest('input, textarea, select')) {
        e.preventDefault();
        navigate('/new');
      }
      // Esc → снять фокус / закрыть оверлеи
      if (e.key === 'Escape') {
        document.activeElement?.blur();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, searchRef]);
};