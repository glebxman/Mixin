# Скрипты обработки учебников

## Установка зависимостей

```bash
cd services/ai
pip install -r requirements.txt
```

## Настройка

Убедитесь, что в `.env` файле указаны:

```env
GOOGLE_AI_API_KEY=your_api_key_here
QDRANT_URL=http://localhost:6333
```

## Запуск Qdrant

### Docker
```bash
docker run -p 6333:6333 qdrant/qdrant
```

### Docker Compose (если есть)
```bash
docker-compose up qdrant
```

## Загрузка учебников

1. Поместите учебники в соответствующие папки в `data/textbooks/`
2. Структура:
   ```
   data/textbooks/
   ├── математика/
   │   ├── ru/
   │   │   ├── 9-класс/
   │   │   │   └── Алгебра_9класс.pdf
   │   │   └── 10-класс/
   │   └── uz/
   ├── физика/
   │   ├── ru/
   │   └── uz/
   └── ...
   ```

## Обработка учебников

### Обработать все учебники
```bash
python scripts/process_textbooks.py
```

### Обработать конкретный предмет
```bash
python scripts/process_textbooks.py --subject математика
```

### Обработать конкретный класс
```bash
python scripts/process_textbooks.py --grade 9
```

### Комбинация фильтров
```bash
python scripts/process_textbooks.py --subject физика --grade 10
```

## Очистка индекса

Если нужно удалить все векторы и начать заново:

```bash
python scripts/clear_textbooks_index.py
```

## Процесс обработки

1. **Извлечение текста** — из PDF/DOCX/TXT/MD
2. **Разбиение на чанки** — ~500 токенов с перекрытием 50 токенов
3. **Векторизация** — создание эмбеддингов через Google Gemini (text-embedding-004)
4. **Индексация** — сохранение в Qdrant с метаданными:
   - `subject` — предмет
   - `language` — язык (ru/uz)
   - `grade` — класс (1-11)
   - `filename` — имя файла
   - `text` — текст чанка
   - `chunk_index` — номер чанка
   - `total_chunks` — всего чанков в документе

## Поддерживаемые форматы

- ✅ PDF (`.pdf`)
- ✅ Microsoft Word (`.docx`)
- ✅ Текст (`.txt`)
- ✅ Markdown (`.md`)

## Примеры названий файлов

Для автоматического определения класса используйте:

- `Математика_9класс_Алимов.pdf`
- `Fizika_10sinf_Turgunov.pdf`
- `Algebra_11klass.docx`
- `Биология_7класс.pdf`

## Проверка результатов

После обработки можно проверить количество векторов:

```python
from qdrant_client import QdrantClient

client = QdrantClient(url="http://localhost:6333")
collection_info = client.get_collection("textbooks")
print(f"Векторов в коллекции: {collection_info.points_count}")
```

## Использование в AI-сервисе

После индексации учебники автоматически используются в RAG-системе:

1. Пользователь задаёт вопрос
2. Вопрос векторизуется
3. Qdrant находит релевантные чанки из учебников
4. Gemini генерирует ответ на основе найденного контекста

## Troubleshooting

### Ошибка "GOOGLE_AI_API_KEY не найден"
Добавьте ключ в `.env` файл

### Ошибка подключения к Qdrant
Убедитесь, что Qdrant запущен на порту 6333

### Пустой текст из PDF
Возможно PDF содержит только изображения. Используйте OCR или конвертируйте в текстовый формат

### Медленная обработка
Это нормально — векторизация через API занимает время. Для больших объёмов используйте батчинг
