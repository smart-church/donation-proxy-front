import React, { useCallback } from "react";
import { useParams } from "react-router-dom";
import PeopleTable from "../components/PeopleTable";
import {
  listManagers,
  addManager,
  removeManager,
  listAdmins,
  addAdmin,
  removeAdmin,
  searchUsers,
} from "../mock/api";

export function Managers() {
  const { eventId } = useParams();
  const list = useCallback(() => listManagers(eventId), [eventId]);
  const add = useCallback((uid) => addManager(eventId, uid), [eventId]);
  const remove = useCallback((uid) => removeManager(eventId, uid), [eventId]);
  const search = useCallback((q) => searchUsers(q), []);
  return (
    <PeopleTable
      title="Организаторы"
      breadcrumb="Редактировать мероприятие › Организаторы"
      fetchList={list}
      fetchSearch={search}
      addFn={add}
      removeFn={remove}
      testidPrefix="managers"
    />
  );
}

export function Admins() {
  const list = useCallback(() => listAdmins(), []);
  const add = useCallback((uid) => addAdmin(uid), []);
  const remove = useCallback((uid) => removeAdmin(uid), []);
  const search = useCallback((q) => searchUsers(q), []);
  return (
    <PeopleTable
      title="Администраторы"
      breadcrumb="Администрация › Администраторы"
      fetchList={list}
      fetchSearch={search}
      addFn={add}
      removeFn={remove}
      testidPrefix="admins"
    />
  );
}
