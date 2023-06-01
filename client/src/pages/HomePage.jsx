import React, { useEffect, useState } from "react";
import { getPageCount, getPagesArray } from "../utils/pages";

import PostList from "../components/posts/PostList";
import LoadingSpinner from "../components/UI/loadingSpinner/LoadingSpinner";
import Button from "../components/UI/Button/Button";

import Carousel from "nuka-carousel";
import {
  BsFillArrowLeftCircleFill,
  BsFillArrowRightCircleFill,
} from "react-icons/bs";

import cl from "../styles/PostsPage.module.css";
import { useNavigate } from "react-router-dom";

const renderCenterLeftControls = ({ previousDisabled, previousSlide }) => (
  <button
    className={cl.arrow__btn}
    disabled={previousDisabled}
    onClick={previousSlide}
    aria-label="Go to previous slide"
  >
    <BsFillArrowLeftCircleFill size={32} />
  </button>
);

const renderCenterRightControls = ({ nextDisabled, nextSlide }) => (
  <button
    className={cl.arrow__btn}
    disabled={nextDisabled}
    onClick={nextSlide}
    aria-label="Go to next slide"
  >
    <BsFillArrowRightCircleFill size={32} />
  </button>
);

const HomePage = () => {
  // localStorage.clear();
  const navigate = useNavigate();
  const storedData = JSON.parse(localStorage.getItem("sessionData"));
  const [loadedPopularPosts, setLoadedPopularPosts] = useState();
  const [loadedPosts, setLoadedPosts] = useState();
  const [isLoading, setIsLoading] = useState(false);
  const [limit, setLimit] = useState(3);
  const [page, setPage] = useState(storedData ? storedData.postPage : 0);
  const [totalPages, setTotalPages] = useState("");
  const pagesArray = getPagesArray(totalPages);

  const fetchPopularPosts = async () => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/posts/popular-posts`
      );

      const responseData = await response.json();

      setLoadedPopularPosts(responseData);
    } catch (err) {
      console.log(err);
    }
  };

  const fetchPosts = async (limit = 0, page = 0) => {
    try {
      // const responseData = await sendRequest(
      //   "http://localhost:5000/api/posts"
      // );
      setIsLoading(true);

      const response = await fetch(
        `http://localhost:5000/api/posts?limit=${limit}&page=${page}`
      );

      const responseData = await response.json();

      if (!response.ok) {
        console.log(responseData.message);
      }

      const totalCount = response.headers.get("X-Total-Count");
      setTotalPages(getPageCount(totalCount, limit));

      console.log(responseData);

      setLoadedPosts(responseData);
      setIsLoading(false);
    } catch (err) {
      console.log(err);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // fetchPosts(limit, page);
    console.clear();
    fetchPosts(limit, page);
    fetchPopularPosts();
  }, []);

  const changePageHandler = (page) => {
    setPage(page);
    console.log("Page " + page);
    fetchPosts(limit, page);

    localStorage.setItem("sessionData", JSON.stringify({ postPage: page }));
  };

  return (
    <>
      {loadedPopularPosts && (
        <div className="carousel__wrapper">
          <Carousel
            wrapAround
            autoplay
            autoplayInterval={5000}
            renderCenterLeftControls={renderCenterLeftControls}
            renderCenterRightControls={renderCenterRightControls}
          >
            {loadedPopularPosts &&
              loadedPopularPosts.map((post) => (
                <div key={post._id} className={cl.image__wrapper}>
                  <div
                    className={cl.image__title}
                    onClick={() => navigate(`/posts/${post._id}`)}
                  >
                    {post.title}
                  </div>
                  <img
                    src={
                      post.image
                        ? "http://localhost:5000/" + post.image
                        : "https://i.pinimg.com/originals/17/48/d3/1748d39b9700b650bdd127078b1a02ea.png"
                    }
                    alt={post.title}
                  />
                </div>
              ))}
          </Carousel>
        </div>
      )}
      {isLoading && <LoadingSpinner />}
      {!isLoading && loadedPosts && (
        <>
          <h1 className="posts__page__title">&#9632; Останні пости</h1>
          <PostList items={loadedPosts} />{" "}
        </>
      )}
      {pagesArray && (
        <div>
          {pagesArray.map((p) =>
            page === p ? (
              <Button
                key={p}
                label={p + 1}
                inverse
                onClick={() => changePageHandler(p)}
              />
            ) : (
              <Button
                key={p}
                label={p + 1}
                onClick={() => changePageHandler(p)}
              />
            )
          )}
        </div>
      )}
    </>
  );
};

export default HomePage;
