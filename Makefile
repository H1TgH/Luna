up:
	docker compose up

down:
	docker compose down

build:
	docker compose up --build

prod-up:
	docker compose -f docker-compose.yml up -d

prod-down:
	docker compose -f docker-compose.yml down

prod-build:
	docker compose -f docker-compose.yml up -d --build

test:
	docker compose -f docker-compose.test.yml up --build -d --remove-orphans
	docker compose -f docker-compose.test.yml exec test_fastapi_app pytest -s -vvv --asyncio-mode=auto
	docker compose -f docker-compose.test.yml down

test-cov:
	docker compose -f docker-compose.test.yml up --build -d --remove-orphans
	docker compose -f docker-compose.test.yml exec test_fastapi_app pytest -s -vvv --asyncio-mode=auto \
		--cov=. \
		--cov-report=term-missing \
		--cov-report=html
	docker compose -f docker-compose.test.yml down