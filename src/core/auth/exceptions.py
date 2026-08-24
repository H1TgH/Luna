class UserAlreadyExistsException(Exception):
    pass


class UserDoesNotExistException(Exception):
    pass


class InvalidCredentialsException(Exception):
    pass


class InvalidTokenException(Exception):
    pass


class TokenIsMissingException(Exception):
    pass


class EmailNotConfirmedException(Exception):
    pass
