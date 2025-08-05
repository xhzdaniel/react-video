import React, { useState, useEffect, useRef, useCallback } from "react";

export default function VideoPlayer() {
  const [allVideos, setAllVideos] = useState([]);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const videoRef = useRef(null);
  const currentVideo = allVideos[currentVideoIndex] || null;

  const fetchAllVideos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/videos`);
      if (!response.ok) {
        throw new Error(
          `Error HTTP: ${response.status} ${response.statusText}`
        );
      }
      const data = await response.json();
      setAllVideos(data.videos || []);

      const initialIndex =
        data.lastViewedVideoIndex >= (data.videos || []).length ||
        data.lastViewedVideoIndex < 0
          ? 0
          : data.lastViewedVideoIndex;
      setCurrentVideoIndex(initialIndex);
    } catch (err) {
      setError(`Error al cargar la lista de videos: ${err.message}`);
      console.error("Error al cargar la lista de videos:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const markVideoAsViewed = useCallback(
    async (videoIdToMark) => {
      if (!videoIdToMark) return;

      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/videos/mark-as-viewed`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ videoId: videoIdToMark }),
        });
        if (!response.ok) {
          throw new Error(
            `Error HTTP: ${response.status} ${response.statusText}`
          );
        }
        const data = await response.json();
        console.log(data.message);

        setShowModal(false);
        await fetchAllVideos();
      } catch (err) {
        setError(`Error al marcar el video como visto: ${err.message}`);
        console.error("Error marking video as viewed:", err);
      } finally {
        setLoading(false);
      }
    },
    [fetchAllVideos]
  );

  const goToNextVideo = useCallback(() => {
    setShowModal(false);
    if (currentVideoIndex < allVideos.length - 1) {
      setCurrentVideoIndex((prevIndex) => prevIndex + 1);
    } else {
      fetchAllVideos();
    }
  }, [currentVideoIndex, allVideos.length, fetchAllVideos]);

  const goToPreviousVideo = useCallback(() => {
    setShowModal(false);
    if (currentVideoIndex > 0) {
      setCurrentVideoIndex((prevIndex) => prevIndex - 1);
    }
  }, [currentVideoIndex]);

  const handleVideoPause = useCallback(() => {
    setIsPlaying(false);
    setShowModal(true);
  }, []);

  const togglePlayPause = useCallback(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current
          .play()
          .catch((e) => console.error("Error al reproducir el video:", e));
      }
    }
  }, [isPlaying]);

  const handleVideoEnd = useCallback(() => {
    setIsPlaying(false);
    setShowModal(true);
  }, []);

  useEffect(() => {
    fetchAllVideos();
  }, [fetchAllVideos]);

  useEffect(() => {
    if (videoRef.current && currentVideo) {
      const videoElement = videoRef.current;
      const onPlayHandler = () => setIsPlaying(true);
      const onPauseHandler = () => setIsPlaying(false);

      videoElement.removeEventListener("play", onPlayHandler);
      videoElement.removeEventListener("pause", onPauseHandler);

      videoElement.addEventListener("play", onPlayHandler);
      videoElement.addEventListener("pause", onPauseHandler);

      videoElement.load();
      videoElement
        .play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch((e) => {
          console.warn(
            "Reproducción automática bloqueada. Haz clic para reproducir.",
            e
          );
          setIsPlaying(false);
        });

      setShowModal(false);

      return () => {
        videoElement.removeEventListener("play", onPlayHandler);
        videoElement.removeEventListener("pause", onPauseHandler);
      };
    } else if (videoRef.current && !currentVideo) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, [currentVideoIndex, currentVideo]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (
        document.activeElement.tagName === "INPUT" ||
        document.activeElement.tagName === "TEXTAREA"
      ) {
        return;
      }

      switch (event.key) {
        case "ArrowRight":
          event.preventDefault();
          goToNextVideo();
          break;
        case "ArrowLeft":
          event.preventDefault();
          goToPreviousVideo();
          break;
        case " ":
          event.preventDefault();
          if (showModal) {
            if (videoRef.current) {
              videoRef.current
                .play()
                .catch((e) => console.error("Error al reanudar:", e));
            }
            setShowModal(false);
          } else {
            togglePlayPause();
          }
          break;
        case "Enter":
          event.preventDefault();
          if (showModal && currentVideo) {
            handleBan(currentVideo.id);
            markVideoAsViewed(currentVideo.id);
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    goToNextVideo,
    goToPreviousVideo,
    togglePlayPause,
    showModal,
    currentVideo,
    markVideoAsViewed,
  ]);

  const handleBan = async (videoId) => {
    try {
      const response = await fetch(`/api/ban`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId: videoId }),
      });
      if (!response.ok) {
        throw new Error(
          `Error HTTP: ${response.status} ${response.statusText}`
        );
      }

      await response.json();
    } catch (err) {
      console.error("Error al banear el usuario:", err.message);
    }
  };

  if (loading) {
    return <div className="video-player-container">Cargando videos...</div>;
  }

  if (error) {
    return (
      <div className="video-player-container">
        <p className="error-message">Error: {error}</p>
        <button
          onClick={fetchAllVideos}
          className="action-button refresh-button"
          style={{ marginTop: "20px" }}
        >
          Reintentar Carga
        </button>
      </div>
    );
  }

  return (
    <div className="video-player-container">
      {allVideos.length > 0 &&
      currentVideoIndex < allVideos.length &&
      currentVideo ? (
        <div className="video-card">
          <div className="video-info">
            <span>
              {currentVideoIndex + 1}/{allVideos.length}
            </span>
            <span>{currentVideo?.uploadedBy}</span>
          </div>
          <div className="container-video-element">
            <video
              ref={videoRef}
              className="video-element"
              onEnded={handleVideoEnd}
              onPause={handleVideoPause}
            >
              <source src={currentVideo.url} type="video/mp4" />
              Tu navegador no soporta el tag de video.
            </video>
            {!isPlaying && !showModal && (
              <div
                className="custom-controls-overlay"
                onClick={togglePlayPause}
              >
                <div className="play-pause-button">▶</div>
              </div>
            )}
          </div>
          {currentVideo.likes !== undefined &&
            currentVideo.dislikes !== undefined && (
              <div className="reaction-bar-container">
                {(() => {
                  const totalReactions =
                    currentVideo.likes + currentVideo.dislikes;
                  const likePercentage =
                    totalReactions > 0
                      ? (currentVideo.likes / totalReactions) * 100
                      : 50;
                  const dislikePercentage =
                    totalReactions > 0
                      ? (currentVideo.dislikes / totalReactions) * 100
                      : 50;

                  return (
                    <>
                      <span>
                        <svg
                          className="w-6 h-6 text-gray-800 dark:text-white"
                          aria-hidden="true"
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            fillRule="evenodd"
                            d="M15.03 9.684h3.965c.322 0 .64.08.925.232.286.153.532.374.717.645a2.109 2.109 0 0 1 .242 1.883l-2.36 7.201c-.288.814-.48 1.355-1.884 1.355-2.072 0-4.276-.677-6.157-1.256-.472-.145-.924-.284-1.348-.404h-.115V9.478a25.485 25.485 0 0 0 4.238-5.514 1.8 1.8 0 0 1 .901-.83 1.74 1.74 0 0 1 1.21-.048c.396.13.736.397.96.757.225.36.32.788.269 1.211l-1.562 4.63ZM4.177 10H7v8a2 2 0 1 1-4 0v-6.823C3 10.527 3.527 10 4.176 10Z"
                            clipRule="evenodd"
                          />
                        </svg>
                        {likePercentage.toFixed(0)}%
                      </span>
                      <div className="percentage-display-row">
                        <div className="progress-bar">
                          <div
                            className="like-segment"
                            style={{ width: `${likePercentage}%` }}
                            title={`Likes: ${
                              currentVideo.likes
                            } (${likePercentage.toFixed(1)}%)`}
                          ></div>
                          <div
                            className="dislike-segment"
                            style={{ width: `${dislikePercentage}%` }}
                            title={`Dislikes: ${
                              currentVideo.dislikes
                            } (${dislikePercentage.toFixed(1)}%)`}
                          ></div>
                        </div>
                      </div>
                      <span>
                        <svg
                          className="w-6 h-6 text-gray-800 dark:text-white"
                          aria-hidden="true"
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            fillRule="evenodd"
                            d="M8.97 14.316H5.004c-.322 0-.64-.08-.925-.232a2.022 2.022 0 0 1-.717-.645 2.108 2.108 0 0 1-.242-1.883l2.36-7.201C5.769 3.54 5.96 3 7.365 3c2.072 0 4.276.678 6.156 1.256.473.145.925.284 1.35.404h.114v9.862a25.485 25.485 0 0 0-4.238 5.514c-.197.376-.516.67-.901.83a1.74 1.74 0 0 1-1.21.048 1.79 1.79 0 0 1-.96-.757 1.867 1.867 0 0 1-.269-1.211l1.562-4.63ZM19.822 14H17V6a2 2 0 1 1 4 0v6.823c0 .65-.527 1.177-1.177 1.177Z"
                            clipRule="evenodd"
                          />
                        </svg>
                        {dislikePercentage.toFixed(0)}%
                      </span>
                    </>
                  );
                })()}
              </div>
            )}
        </div>
      ) : (
        <div className="no-videos-message">
          <p>
            {allVideos.length === 0 || !allVideos
              ? "No hay videos disponibles en este momento."
              : "Has revisado todos los videos actualmente disponibles."}
          </p>
          <button
            onClick={fetchAllVideos}
            className="action-button refresh-button"
          >
            Recargar Videos
          </button>
        </div>
      )}

      <div className={`modal-overlay ${showModal ? "show" : ""}`}>
        <div
          className={`modal-content ${showModal ? "show" : ""}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="video-info">
            <span>
              {currentVideoIndex + 1}/{allVideos.length}
            </span>
            <span>{currentVideo?.uploadedBy}</span>
          </div>
          {currentVideo && (
            <>
              <div className="modal-button-container">
                <button
                  onClick={goToPreviousVideo}
                  className="action-button refresh-button grid-center-item"
                  disabled={currentVideoIndex === 0}
                >
                  <span className="modal-button-key">
                    <svg
                      className="w-6 h-6 text-gray-800 dark:text-white"
                      aria-hidden="true"
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 12h14M5 12l4-4m-4 4 4 4"
                      />
                    </svg>
                  </span>
                  <span>Anterior Clip</span>
                </button>
                <button
                  onClick={() => {
                    setShowModal(false);
                    if (videoRef.current) {
                      videoRef.current
                        .play()
                        .catch((e) => console.error("Error al reanudar:", e));
                    }
                  }}
                  className="action-button refresh-button"
                >
                  <span className="modal-button-key">
                    <svg
                      className="w-6 h-6 text-gray-800 dark:text-white"
                      aria-hidden="true"
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M4 15v2a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-2M12 4v12m0-12 4 4m-4-4L8 8"
                      />
                    </svg>
                  </span>
                  <span>Reproducir / Pausar </span>
                </button>
                <button
                  onClick={() => {
                    goToNextVideo();
                    markVideoAsViewed(currentVideo.id);
                  }}
                  className="action-button refresh-button grid-center-item"
                >
                  <span className="modal-button-key">
                    <svg
                      className="w-6 h-6 text-gray-800 dark:text-white"
                      aria-hidden="true"
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 12H5m14 0-4 4m4-4-4-4"
                      />
                    </svg>
                  </span>
                  <span>Siguiente Clip</span>
                </button>
                <button
                  onClick={() => {
                    handleBan(currentVideo.id);
                    markVideoAsViewed(currentVideo.id);
                  }}
                  className="action-button ban-button"
                >
                  <span className="modal-button-key">Enter</span>
                  <span>Ban</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
