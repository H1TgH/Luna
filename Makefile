up:
	docker compose up

down:
	docker compose down

build:
	docker compose up --build

test:
	docker compose -f docker-compose.test.yml up --build -d --remove-orphans
	docker compose -f docker-compose.test.yml exec -it test_fastapi_app bash -c "pytest -s -vvv --asyncio-mode=auto"
	docker compose -f docker-compose.test.yml down

test-cov:
	docker compose -f docker-compose.test.yml up --build -d --remove-orphans
	docker compose -f docker-compose.test.yml exec -it test_fastapi_app bash -c "\
	pytest -s -vvv --asyncio-mode=auto \
	--cov=. \
	--cov-report=term-missing \
	--cov-report=html"
	docker compose -f docker-compose.test.yml down
