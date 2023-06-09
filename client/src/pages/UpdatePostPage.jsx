import React, { useContext, useEffect, useState } from "react";
import { useHttpClient } from "../hooks/http-hook";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "../hooks/form-hook";
import LoadingSpinner from "../components/UI/loadingSpinner/LoadingSpinner";
import Input from "../components/UI/input/Input";
import Button from "../components/UI/Button/Button";
import { VALIDATOR_MINLENGTH, VALIDATOR_REQUIRE } from "../utils/validators";
import { AuthContext } from "../context/auth-context";

import { convertToRaw, EditorState, ContentState } from "draft-js";
import { Editor } from "react-draft-wysiwyg";
import draftToHtml from "draftjs-to-html";
import htmlToDraft from "html-to-draftjs";
import "draft-js/dist/Draft.css";
import "react-draft-wysiwyg/dist/react-draft-wysiwyg.css";
import ImageUpload from "../components/image-upload/ImageUpload";

const UpdatePostPage = () => {
  const auth = useContext(AuthContext);
  const { isLoading, error, sendRequest, clearError } = useHttpClient();
  const [loadedPost, setLoadedPost] = useState();
  const params = useParams();
  const navigate = useNavigate();

  const [editorState, setEditorState] = useState(() =>
    EditorState.createEmpty()
  );

  const [formState, inputHandler, setFormData] = useForm(
    {
      title: {
        value: "",
        isValid: false,
      },
      rubric: {
        value: "Новини",
        isValid: true,
      },
      description: {
        value: "",
        isValid: false,
      },
      image: {
        value: null,
        isValid: true,
      },
      // content: {
      //   value: "",
      //   isValid: false,
      // },
    },
    false
  );

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const responseData = await sendRequest(
          `${process.env.REACT_APP_API_URL}/posts/${params.postId}`
        );
        setLoadedPost(responseData);
        setFormData(
          {
            title: {
              value: responseData.title,
              isValid: true,
            },
            rubric: {
              value: responseData.rubric,
              isValid: true,
            },
            description: {
              value: responseData.description,
              isValid: true,
            },
            image: {
              value: responseData.image,
              isValid: true,
            },
            // content: {
            //   value: responseData.content,
            //   isValid: true,
            // },
          },
          false
        );

        const contentBlock = htmlToDraft(responseData.content);
        const contentState = ContentState.createFromBlockArray(
          contentBlock.contentBlocks
        );
        const editorState = EditorState.createWithContent(contentState);

        setEditorState(editorState);
      } catch (err) {
        console.log(err);
      }
    };

    fetchPost();
  }, [sendRequest, params.postId, setFormData]);

  const postUpdateSubmitHandler = async (event) => {
    event.preventDefault();
    try {
      // console.log(draftToHtml(convertToRaw(editorState.getCurrentContent())));
      const formData = new FormData();
      formData.append("title", formState.inputs.title.value);
      formData.append("rubric", formState.inputs.rubric.value);
      formData.append("description", formState.inputs.description.value);
      formData.append(
        "content",
        draftToHtml(convertToRaw(editorState.getCurrentContent()))
      );
      formData.append("image", formState.inputs.image.value);

      await sendRequest(
        `${process.env.REACT_APP_API_URL}/posts/${params.postId}`,
        "PATCH",
        formData,
        { Authorization: "Bearer " + auth.token }
      );

      navigate("/");
    } catch (err) {
      console.log(err);
    }
  };

  if (isLoading) {
    return (
      <div className="center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!loadedPost && !error) {
    return (
      <div className="center">
        <h2>Не знайдено пост</h2>
      </div>
    );
  }

  // console.log(loadedPost.image);

  return (
    <>
      <h2>Оновлення поста</h2>
      <form className="place-form" onSubmit={postUpdateSubmitHandler}>
        <Input
          id="title"
          element="input"
          type="text"
          label="Назва"
          placeholder="Введіть назву поста.."
          validators={[VALIDATOR_REQUIRE()]}
          errorText="Введіть назву"
          onInput={inputHandler}
          initialValue={formState.inputs.title.value}
          initialValid={true}
        />
        <Input
          id="rubric"
          element="input"
          type="text"
          label="Рубрика"
          placeholder="Введіть рубрику поста.."
          validators={[VALIDATOR_REQUIRE()]}
          errorText="Оберіть рубрику"
          onInput={inputHandler}
          initialValue={formState.inputs.rubric.value}
          initialValid={true}
        />
        {/* <select onChange={rubricChangeHandler}>
          <option>Новини</option>
          <option>Статті</option>
        </select> */}
        <Input
          id="description"
          element="input"
          type="text"
          label="Короткий опис"
          placeholder="Введіть короткий опис.."
          validators={[VALIDATOR_REQUIRE()]}
          errorText="Введіть короткий опис"
          onInput={inputHandler}
          initialValue={formState.inputs.description.value}
          initialValid={true}
        />
        <div>Контент</div>

        <ImageUpload
          center
          id="image"
          onInput={inputHandler}
          errorText="Оберіть зображення"
          imageUrl={
            loadedPost.image && process.env.REACT_APP_URL + loadedPost.image
          }
          width="400px"
        />

        <Editor
          editorState={editorState}
          onEditorStateChange={setEditorState}
          wrapperClassName="wrapper-class"
          editorClassName="editor-class"
          toolbarClassName="toolbar-class"
          // toolbar={{
          //   options: ["inline"],
          // }}
        />

        <Button
          label="Оновити пост"
          type="submit"
          disabled={!formState.isValid}
        />
      </form>
    </>
  );
};

export default UpdatePostPage;
