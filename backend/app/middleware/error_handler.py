from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
import logging
import traceback

logger = logging.getLogger(__name__)

async def error_handler_middleware(request: Request, call_next):
    try:
        response = await call_next(request)
        return response
    except HTTPException as e:
        return JSONResponse(
            status_code=e.status_code,
            content={"detail": e.detail, "status": "error"}
        )
    except Exception as e:
        tb = traceback.format_exc()
        logger.error(f"Unhandled error: {e}\n{tb}")
        # Return full traceback in response so we can debug
        return JSONResponse(
            status_code=500,
            content={"detail": str(e), "traceback": tb, "status": "error"}
        )
