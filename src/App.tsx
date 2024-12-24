/* eslint-disable jsx-a11y/label-has-associated-control */
/* eslint-disable jsx-a11y/control-has-associated-label */
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { TodoList } from './components/TodoList/TodoList';
import { UserWarning } from './UserWarning';
import { USER_ID, getTodos, addTodo, deleteTodo } from './api/todos';
import { Todo } from './types/Todo';
import { Footer } from './components/Footer/Footer';

export enum FilterOptions {
  All = 'All',
  Active = 'Active',
  Completed = 'Completed',
}

export const App: React.FC = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [tempTodo, setTempTodo] = useState<Todo | null>(null);
  const [error, setError] = useState('');
  const [filterOption, setFilterOption] = useState<FilterOptions>(
    FilterOptions.All,
  );
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const allCompleted = todos.length > 0 && todos.every(todo => todo.completed);

  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = newTodoTitle.trim();

    if (!trimmedTitle) {
      setError('Title should not be empty');

      return;
    }

    setIsLoading(true);
    setTempTodo({
      id: 0, // Временный ID
      userId: USER_ID, // Добавляем обязательное поле userId
      title: trimmedTitle,
      completed: false,
    });

    try {
      const newTodo = await addTodo(trimmedTitle);

      setTodos(prevTodos => [...prevTodos, newTodo]);
      setNewTodoTitle('');
    } catch {
      setError('Unable to add todo');
    } finally {
      setTempTodo(null);
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleDelete = useCallback(async (todoId: number) => {
    setTodos(prevTodos =>
      prevTodos.map(todo =>
        todo.id === todoId ? { ...todo, isLoading: true } : todo,
      ),
    );

    try {
      await deleteTodo(todoId);
      setTodos(prevTodos => prevTodos.filter(todo => todo.id !== todoId));
    } catch {
      setTodos(prevTodos =>
        prevTodos.map(todo =>
          todo.id === todoId ? { ...todo, isLoading: false } : todo,
        ),
      );
      setError('Unable to delete a todo');
    }
  }, []);

  const handleClearCompleted = async () => {
    const completedTodos = todos.filter(todo => todo.completed);
    const errors: string[] = [];

    const promises = completedTodos.map(async todo => {
      try {
        await deleteTodo(todo.id);
        setTodos(prevTodos => prevTodos.filter(t => t.id !== todo.id));
      } catch {
        errors.push(`Unable to delete todo: ${todo.title}`);
      }
    });

    await Promise.all(promises);

    if (errors.length) {
      setError(errors.join(', '));
    }
  };

  const toggleAll = () => {
    const shouldCompleteAll = !allCompleted;

    setTodos(todos.map(todo => ({ ...todo, completed: shouldCompleteAll })));
  };

  const filteredTodos = useMemo(() => {
    return todos.filter(todo => {
      switch (filterOption) {
        case FilterOptions.Active:
          return !todo.completed;
        case FilterOptions.Completed:
          return todo.completed;
        default:
          return true;
      }
    });
  }, [todos, filterOption]);

  useEffect(() => {
    const loadTodos = async () => {
      setIsLoading(true);
      try {
        const todosFromApi = await getTodos();

        setTodos(todosFromApi);
      } catch {
        setError('Unable to load todos');
      } finally {
        setIsLoading(false);
      }
    };

    loadTodos();
  }, []);

  useEffect(() => {
    if (error) {
      const timeout = setTimeout(() => setError(''), 3000);

      return () => clearTimeout(timeout);
    }
  }, [error]);

  if (!USER_ID) {
    return <UserWarning />;
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const toggleTodoCompletion = useCallback((id: number) => {
    setTodos(prevTodos =>
      prevTodos.map(todo =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo,
      ),
    );
  }, []);

  return (
    <div className="todoapp">
      <h1 className="todoapp__title">todos</h1>

      <div className="todoapp__content">
        <header className="todoapp__header">
          <button
            type="button"
            className={`todoapp__toggle-all ${allCompleted ? 'active' : ''}`}
            onClick={toggleAll}
            aria-label="Toggle all todos"
          />
          <form onSubmit={handleAddTodo}>
            <input
              value={newTodoTitle}
              onChange={e => setNewTodoTitle(e.target.value)}
              type="text"
              data-cy="NewTodoField"
              className="todoapp__new-todo"
              placeholder="What needs to be done?"
              disabled={isLoading}
              ref={inputRef}
            />
          </form>
        </header>

        {tempTodo && (
          <div className="todo temp-todo">
            <span>{tempTodo.title}</span>
            <div className="loader" />
          </div>
        )}

        <TodoList
          todos={filteredTodos}
          onToggleTodo={toggleTodoCompletion}
          onDelete={handleDelete}
        />

        <Footer
          todos={todos}
          filterOption={filterOption}
          setFilterOption={setFilterOption}
          handleClearCompleted={handleClearCompleted}
          isLoading={false}
        />
      </div>

      {error && (
        <div className="notification is-danger">
          <button onClick={() => setError('')} className="delete" />
          {error}
        </div>
      )}
    </div>
  );
};
